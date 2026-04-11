import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import { withTransaction } from "../assets/routes/transaction.js";

// ---------------------------------------------------------------------------
// Match evaluation math (ported from ai_service/match_evaluation.py)
// ---------------------------------------------------------------------------

function getRankFromScore(score) {
  if (score < 200) return "Beginner";
  if (score < 400) return "Intermediate";
  if (score < 600) return "Advanced";
  return "Professional";
}

function computeScoreDelta(peerScores, selfScore = null) {
  const PEER_WEIGHT = 1.0;
  const SELF_WEIGHT = 0.3;
  const SCALE_FACTOR = 8.0;
  const NEUTRAL = 5.0;

  const peerAvg = peerScores.reduce((a, b) => a + b, 0) / peerScores.length;

  const finalEval =
    selfScore === null
      ? peerAvg
      : (PEER_WEIGHT * peerAvg + SELF_WEIGHT * selfScore) / (PEER_WEIGHT + SELF_WEIGHT);

  return (finalEval - NEUTRAL) * SCALE_FACTOR;
}

function updatePlayerRating(currentScore, peerScores, selfScore = null) {
  const oldRank = getRankFromScore(currentScore);
  const delta = computeScoreDelta(peerScores, selfScore);
  const newScore = Math.max(0, Math.min(800, currentScore + delta));
  const newRank = getRankFromScore(newScore);

  return {
    oldScore: Math.round(currentScore * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    newScore: Math.round(newScore * 100) / 100,
    oldRank,
    newRank,
    rankChanged: oldRank !== newRank,
  };
}

// ---------------------------------------------------------------------------
// Finalization logic (shared by auto-finalize and manual trigger)
// ---------------------------------------------------------------------------

async function finalizeSession(sessionId, client) {
  // Get all players in the session
  const players = await client.query(
    "SELECT user_id FROM session_players WHERE session_id = $1",
    [sessionId]
  );

  if (players.rows.length < 2) return [];

  const updates = [];

  for (const player of players.rows) {
    // Collect peer scores for this player (where others rated them)
    const peerRows = await client.query(
      `SELECT score FROM session_ratings
       WHERE session_id = $1 AND rated_id = $2 AND rater_id != $2`,
      [sessionId, player.user_id]
    );

    if (peerRows.rows.length === 0) continue;

    // Check for self-score
    const selfRow = await client.query(
      `SELECT score FROM session_ratings
       WHERE session_id = $1 AND rater_id = $2 AND rated_id = $2`,
      [sessionId, player.user_id]
    );

    // Get current rating
    const profileRow = await client.query(
      "SELECT rating_score FROM player_profile WHERE user_id = $1",
      [player.user_id]
    );

    if (profileRow.rows.length === 0) continue;

    const currentScore = parseFloat(profileRow.rows[0].rating_score) || 0;
    const peerScores = peerRows.rows.map((r) => parseFloat(r.score));
    const selfScore = selfRow.rows.length > 0 ? parseFloat(selfRow.rows[0].score) : null;

    const result = updatePlayerRating(currentScore, peerScores, selfScore);

    // Update profile
    await client.query(
      "UPDATE player_profile SET rating_score = $1, rank = $2, matches_played = COALESCE(matches_played, 0) + 1 WHERE user_id = $3",
      [result.newScore, result.newRank, player.user_id]
    );

    updates.push({ user_id: player.user_id, ...result });
  }

  // Mark finalized
  await client.query(
    `INSERT INTO session_rating_status (session_id, finalized, finalized_at)
     VALUES ($1, TRUE, NOW())
     ON CONFLICT (session_id) DO UPDATE SET finalized = TRUE, finalized_at = NOW()`,
    [sessionId]
  );

  return updates;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function ratingRoutes(app) {
  // Sessions the user needs to rate (ended in last 24h, participated, not yet rated)
  app.get("/sessions/to-rate", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.id AS session_id, s.sport, s.session_name, s.skill_level,
                s.max_players, s.start_time, s.end_time, s.venue_id,
                v.venue_name,
                COUNT(sp2.id)::int AS player_count
         FROM sessions s
         JOIN session_players sp ON sp.session_id = s.id AND sp.user_id = $1
         JOIN venues v ON v.id = s.venue_id
         LEFT JOIN session_players sp2 ON sp2.session_id = s.id
         WHERE s.end_time < NOW()
           AND s.end_time > NOW() - INTERVAL '7 days'
           AND COALESCE(s.session_type, 'casual') = 'ranked'
           AND NOT EXISTS (
             SELECT 1 FROM session_ratings sr
             WHERE sr.session_id = s.id AND sr.rater_id = $1
           )
           AND NOT EXISTS (
             SELECT 1 FROM session_rating_status srs
             WHERE srs.session_id = s.id AND srs.finalized = TRUE
           )
         GROUP BY s.id, v.id
         HAVING COUNT(sp2.id) >= 2
         ORDER BY s.end_time DESC`,
        [req.userId]
      );
      return res.json({ ok: true, sessions: result.rows });
    } catch (err) {
      console.error("To-rate sessions error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Check rating status for a session
  app.get("/sessions/:id/rating-status", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      // Verify user is a participant
      const participation = await pool.query(
        "SELECT 1 FROM session_players WHERE session_id = $1 AND user_id = $2",
        [sessionId, req.userId]
      );
      if (participation.rows.length === 0) {
        return res.status(403).json({ ok: false, message: "Not a participant" });
      }

      // Get session end_time
      const session = await pool.query(
        "SELECT end_time FROM sessions WHERE id = $1",
        [sessionId]
      );
      if (session.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Session not found" });
      }

      const endTime = new Date(session.rows[0].end_time);
      const isEnded = endTime < new Date();
      const ratingDeadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      const deadlinePassed = ratingDeadline < new Date();

      // Check if user already rated
      const ratedCheck = await pool.query(
        "SELECT 1 FROM session_ratings WHERE session_id = $1 AND rater_id = $2 LIMIT 1",
        [sessionId, req.userId]
      );
      const hasRated = ratedCheck.rows.length > 0;

      // Check finalization
      const statusCheck = await pool.query(
        "SELECT finalized FROM session_rating_status WHERE session_id = $1",
        [sessionId]
      );
      const isFinalized = statusCheck.rows.length > 0 && statusCheck.rows[0].finalized;

      // Lazy finalization: if deadline passed + has ratings + not finalized → finalize now
      if (deadlinePassed && !isFinalized) {
        const hasAnyRatings = await pool.query(
          "SELECT 1 FROM session_ratings WHERE session_id = $1 LIMIT 1",
          [sessionId]
        );
        if (hasAnyRatings.rows.length > 0) {
          await withTransaction(async (client) => {
            await finalizeSession(sessionId, client);
          });
        }
      }

      // Get co-players
      const coPlayers = await pool.query(
        `SELECT sp.user_id, u.username, pp.avatar_url
         FROM session_players sp
         JOIN users u ON u.id = sp.user_id
         LEFT JOIN player_profile pp ON pp.user_id = sp.user_id
         WHERE sp.session_id = $1 AND sp.user_id != $2`,
        [sessionId, req.userId]
      );

      return res.json({
        ok: true,
        is_ended: isEnded,
        has_rated: hasRated,
        is_finalized: isFinalized || (deadlinePassed && hasRated),
        rating_deadline: ratingDeadline.toISOString(),
        players: coPlayers.rows,
      });
    } catch (err) {
      console.error("Rating status error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Submit ratings for a session
  app.post("/sessions/:id/rate", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    const { ratings, self_score } = req.body;

    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({ ok: false, message: "ratings array required" });
    }

    // Validate each rating
    for (const r of ratings) {
      if (!r.user_id || typeof r.score !== "number" || r.score < 0 || r.score > 10) {
        return res.status(400).json({ ok: false, message: "Each rating needs user_id and score (0-10)" });
      }
    }

    if (self_score !== undefined && self_score !== null) {
      if (typeof self_score !== "number" || self_score < 0 || self_score > 10) {
        return res.status(400).json({ ok: false, message: "self_score must be 0-10" });
      }
    }

    try {
      const result = await withTransaction(async (client) => {
        // Verify session exists and has ended
        const session = await client.query(
          "SELECT end_time, created_by FROM sessions WHERE id = $1 FOR UPDATE",
          [sessionId]
        );
        if (session.rows.length === 0) {
          const err = new Error("Session not found");
          err.code = "NOT_FOUND";
          throw err;
        }

        const endTime = new Date(session.rows[0].end_time);
        if (endTime > new Date()) {
          const err = new Error("Session has not ended yet");
          err.code = "NOT_ENDED";
          throw err;
        }

        const ratingDeadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
        if (ratingDeadline < new Date()) {
          const err = new Error("Rating window has closed (24h after session end)");
          err.code = "DEADLINE_PASSED";
          throw err;
        }

        // Verify user is a participant
        const participation = await client.query(
          "SELECT 1 FROM session_players WHERE session_id = $1 AND user_id = $2",
          [sessionId, req.userId]
        );
        if (participation.rows.length === 0) {
          const err = new Error("Not a participant");
          err.code = "NOT_PARTICIPANT";
          throw err;
        }

        // Check if already rated
        const alreadyRated = await client.query(
          "SELECT 1 FROM session_ratings WHERE session_id = $1 AND rater_id = $2 LIMIT 1",
          [sessionId, req.userId]
        );
        if (alreadyRated.rows.length > 0) {
          const err = new Error("Already rated this session");
          err.code = "ALREADY_RATED";
          throw err;
        }

        // Check not finalized
        const statusCheck = await client.query(
          "SELECT finalized FROM session_rating_status WHERE session_id = $1 FOR UPDATE",
          [sessionId]
        );
        if (statusCheck.rows.length > 0 && statusCheck.rows[0].finalized) {
          const err = new Error("Ratings already finalized");
          err.code = "ALREADY_FINALIZED";
          throw err;
        }

        // Verify all rated users are co-participants
        const allPlayers = await client.query(
          "SELECT user_id FROM session_players WHERE session_id = $1 AND user_id != $2",
          [sessionId, req.userId]
        );
        const validIds = new Set(allPlayers.rows.map((p) => p.user_id));
        for (const r of ratings) {
          if (!validIds.has(r.user_id)) {
            const err = new Error(`User ${r.user_id} is not a co-participant`);
            err.code = "INVALID_RATED_USER";
            throw err;
          }
        }

        // Insert peer ratings
        for (const r of ratings) {
          await client.query(
            `INSERT INTO session_ratings (session_id, rater_id, rated_id, score)
             VALUES ($1, $2, $3, $4)`,
            [sessionId, req.userId, r.user_id, r.score]
          );
        }

        // Insert self-score if provided
        if (self_score !== undefined && self_score !== null) {
          await client.query(
            `INSERT INTO session_ratings (session_id, rater_id, rated_id, score)
             VALUES ($1, $2, $2, $3)`,
            [sessionId, req.userId, self_score]
          );
        }

        // Check if all participants have now rated
        const totalPlayers = await client.query(
          "SELECT COUNT(*)::int AS c FROM session_players WHERE session_id = $1",
          [sessionId]
        );
        const totalRaters = await client.query(
          "SELECT COUNT(DISTINCT rater_id)::int AS c FROM session_ratings WHERE session_id = $1",
          [sessionId]
        );

        let updates = null;
        if (totalRaters.rows[0].c >= totalPlayers.rows[0].c) {
          updates = await finalizeSession(sessionId, client);
        }

        return { updates };
      });

      if (result.updates) {
        const myUpdate = result.updates.find((u) => u.user_id === req.userId);
        return res.json({
          ok: true,
          message: "Ratings submitted and finalized",
          finalized: true,
          my_update: myUpdate || null,
        });
      }

      return res.json({ ok: true, message: "Ratings submitted", finalized: false });
    } catch (err) {
      if (err.code === "NOT_FOUND") return res.status(404).json({ ok: false, message: err.message });
      if (err.code === "NOT_ENDED") return res.status(400).json({ ok: false, message: err.message });
      if (err.code === "DEADLINE_PASSED") return res.status(400).json({ ok: false, message: err.message });
      if (err.code === "NOT_PARTICIPANT") return res.status(403).json({ ok: false, message: err.message });
      if (err.code === "ALREADY_RATED") return res.status(409).json({ ok: false, message: err.message });
      if (err.code === "ALREADY_FINALIZED") return res.status(409).json({ ok: false, message: err.message });
      if (err.code === "INVALID_RATED_USER") return res.status(400).json({ ok: false, message: err.message });
      console.error("Submit ratings error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Manual finalize (for admin or cron-like trigger)
  app.post("/sessions/:id/finalize-ratings", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      // Only the creator can manually finalize
      const session = await pool.query(
        "SELECT created_by, end_time FROM sessions WHERE id = $1",
        [sessionId]
      );
      if (session.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Session not found" });
      }
      if (session.rows[0].created_by !== req.userId) {
        return res.status(403).json({ ok: false, message: "Only the creator can finalize" });
      }
      if (new Date(session.rows[0].end_time) > new Date()) {
        return res.status(400).json({ ok: false, message: "Session has not ended" });
      }

      // Check if already finalized
      const statusCheck = await pool.query(
        "SELECT finalized FROM session_rating_status WHERE session_id = $1",
        [sessionId]
      );
      if (statusCheck.rows.length > 0 && statusCheck.rows[0].finalized) {
        return res.json({ ok: true, message: "Already finalized", updates: [] });
      }

      const updates = await withTransaction(async (client) => {
        return await finalizeSession(sessionId, client);
      });

      return res.json({ ok: true, message: "Ratings finalized", updates });
    } catch (err) {
      console.error("Finalize ratings error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}
