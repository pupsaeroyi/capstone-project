import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import { withTransaction } from "../assets/routes/transaction.js";

export function sessionRoutes(app) {
  // Get all active sessions across all venues (public)
  app.get("/sessions", async (req, res) => {
    try {
      const { skill, when } = req.query;
      const conditions = ["s.end_time > NOW()"];
      const params = [];

      if (skill && String(skill).toLowerCase() !== "all") {
        const normalized = String(skill).toLowerCase();
        if (["beginner", "intermediate", "advanced", "pro"].includes(normalized)) {
          params.push(normalized);
          conditions.push(`LOWER(s.skill_level) IN ('all', $${params.length})`);
        }
      }

      if (when === "today") {
        conditions.push("s.start_time::date = CURRENT_DATE");
      } else if (when === "tomorrow") {
        conditions.push("s.start_time::date = CURRENT_DATE + INTERVAL '1 day'");
      } else if (when === "week") {
        conditions.push("s.start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'");
      }

      const whereClause = conditions.join(" AND ");

      const result = await pool.query(
        `SELECT
           s.id AS session_id,
           s.sport,
           s.session_name,
           s.skill_level,
           s.max_players,
           s.start_time,
           s.end_time,
           s.created_by,
           s.venue_id,
           v.venue_name,
           v.rating AS venue_rating,
           COUNT(sp.id)::int AS player_count
         FROM sessions s
         JOIN venues v ON v.id = s.venue_id
         LEFT JOIN session_players sp ON sp.session_id = s.id
         WHERE ${whereClause}
         GROUP BY s.id, v.id
         ORDER BY s.start_time ASC`,
        params
      );

      const sessionIds = result.rows.map(s => s.session_id);
      let playersBySession = {};
      if (sessionIds.length > 0) {
        const playersResult = await pool.query(
          "SELECT session_id, user_id FROM session_players WHERE session_id = ANY($1)",
          [sessionIds]
        );
        for (const p of playersResult.rows) {
          if (!playersBySession[p.session_id]) playersBySession[p.session_id] = [];
          playersBySession[p.session_id].push(p.user_id);
        }
      }

      const sessions = result.rows.map(s => ({
        ...s,
        venue_rating: parseFloat(s.venue_rating),
        player_ids: playersBySession[s.session_id] || [],
      }));

      return res.json({ ok: true, sessions });
    } catch (err) {
      console.error("Get all sessions error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Get single session detail (public)
  app.get("/sessions/:id", async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      const result = await pool.query(
        `SELECT
           s.id AS session_id,
           s.sport,
           s.session_name,
           s.skill_level,
           s.max_players,
           s.start_time,
           s.end_time,
           s.created_by,
           s.venue_id,
           v.venue_name,
           v.condition_label,
           u.username AS host_username
         FROM sessions s
         JOIN venues v ON v.id = s.venue_id
         JOIN users u ON u.id = s.created_by
         WHERE s.id = $1`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Session not found" });
      }

      const session = result.rows[0];

      const playersResult = await pool.query(
        `SELECT sp.user_id, u.username
         FROM session_players sp
         JOIN users u ON u.id = sp.user_id
         WHERE sp.session_id = $1`,
        [sessionId]
      );

      const isEnded = new Date(session.end_time) < new Date();

      // If there's an auth header, try to add rating flags
      let hasRated = false;
      let isFinalized = false;
      let requestingUserId = null;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const jwt = await import("jsonwebtoken");
          const token = authHeader.split(" ")[1];
          const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
          requestingUserId = decoded.sub;

          if (isEnded && requestingUserId) {
            const ratedCheck = await pool.query(
              "SELECT 1 FROM session_ratings WHERE session_id = $1 AND rater_id = $2 LIMIT 1",
              [sessionId, requestingUserId]
            );
            hasRated = ratedCheck.rows.length > 0;

            const statusCheck = await pool.query(
              "SELECT finalized FROM session_rating_status WHERE session_id = $1",
              [sessionId]
            );
            isFinalized = statusCheck.rows.length > 0 && statusCheck.rows[0].finalized;
          }
        } catch (_) {
          // Invalid token — just skip rating flags, keep endpoint public
        }
      }

      return res.json({
        ok: true,
        session: {
          ...session,
          player_count: playersResult.rows.length,
          players: playersResult.rows,
          is_ended: isEnded,
          has_rated: hasRated,
          is_finalized: isFinalized,
        },
      });
    } catch (err) {
      console.error("Get session detail error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Get active sessions for a venue (public)
  app.get("/venues/:id/sessions", async (req, res) => {
    const venueId = parseInt(req.params.id, 10);

    if (isNaN(venueId)) {
      return res.status(400).json({ ok: false, message: "Invalid venue ID" });
    }

    try {
      const result = await pool.query(
        `SELECT
           s.id AS session_id,
           s.sport,
           s.session_name,
           s.skill_level,
           s.max_players,
           s.start_time,
           s.end_time,
           s.created_by,
           COUNT(sp.id)::int AS player_count
         FROM sessions s
         LEFT JOIN session_players sp ON sp.session_id = s.id
         WHERE s.venue_id = $1 AND s.end_time > NOW()
         GROUP BY s.id
         ORDER BY s.start_time ASC`,
        [venueId]
      );

      // Get player user_ids for each session
      const sessionIds = result.rows.map(s => s.session_id);
      let playersBySession = {};
      if (sessionIds.length > 0) {
        const playersResult = await pool.query(
          "SELECT session_id, user_id FROM session_players WHERE session_id = ANY($1)",
          [sessionIds]
        );
        for (const p of playersResult.rows) {
          if (!playersBySession[p.session_id]) playersBySession[p.session_id] = [];
          playersBySession[p.session_id].push(p.user_id);
        }
      }

      const sessions = result.rows.map(s => ({
        ...s,
        player_ids: playersBySession[s.session_id] || [],
      }));

      return res.json({ ok: true, sessions });
    } catch (err) {
      console.error("Get venue sessions error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Create a session (auth required)
  app.post("/sessions", requireAuth, async (req, res) => {
    let { venue_id, sport, max_players, start_time, end_time, session_name, skill_level } = req.body;

    sport = typeof sport === "string" ? sport.trim() : "volleyball";
    session_name = typeof session_name === "string" ? session_name.trim() : "";
    skill_level = typeof skill_level === "string" ? skill_level.trim() : "all";

    if (!venue_id || !max_players || !start_time || !end_time) {
      return res.status(400).json({ ok: false, message: "venue_id, max_players, start_time, and end_time are required" });
    }

    max_players = parseInt(max_players, 10);
    if (isNaN(max_players) || max_players < 2) {
      return res.status(400).json({ ok: false, message: "max_players must be at least 2" });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ ok: false, message: "Invalid date format" });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ ok: false, message: "end_time must be after start_time" });
    }

    if (endDate <= new Date()) {
      return res.status(400).json({ ok: false, message: "Session must be in the future" });
    }

    try {
      const venueCheck = await pool.query("SELECT 1 FROM venues WHERE id = $1", [venue_id]);
      if (venueCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Venue not found" });
      }

      const session = await withTransaction(async (client) => {
        const result = await client.query(
          `INSERT INTO sessions (venue_id, created_by, sport, max_players, start_time, end_time, session_name, skill_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, venue_id, sport, max_players, start_time, end_time, session_name, skill_level`,
          [venue_id, req.userId, sport, max_players, start_time, end_time, session_name || null, skill_level]
        );

        const newSession = result.rows[0];

        await client.query(
          "INSERT INTO session_players (session_id, user_id) VALUES ($1, $2)",
          [newSession.id, req.userId]
        );

        return newSession;
      });

      return res.status(201).json({
        ok: true,
        session: {
          session_id: session.id,
          venue_id: session.venue_id,
          sport: session.sport,
          session_name: session.session_name,
          skill_level: session.skill_level,
          max_players: session.max_players,
          player_count: 1,
          start_time: session.start_time,
          end_time: session.end_time,
        },
      });
    } catch (err) {
      console.error("Create session error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Join a session (auth required)
  app.post("/sessions/:id/join", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      const result = await withTransaction(async (client) => {
        const sessionResult = await client.query(
          "SELECT id, max_players FROM sessions WHERE id = $1 AND end_time > NOW() FOR UPDATE",
          [sessionId]
        );

        if (sessionResult.rows.length === 0) {
          const err = new Error("Session not found");
          err.code = "SESSION_NOT_FOUND";
          throw err;
        }

        const session = sessionResult.rows[0];

        const alreadyJoined = await client.query(
          "SELECT 1 FROM session_players WHERE session_id = $1 AND user_id = $2",
          [sessionId, req.userId]
        );

        if (alreadyJoined.rows.length > 0) {
          const err = new Error("Already joined");
          err.code = "ALREADY_JOINED";
          throw err;
        }

        const countResult = await client.query(
          "SELECT COUNT(*)::int AS player_count FROM session_players WHERE session_id = $1",
          [sessionId]
        );

        if (countResult.rows[0].player_count >= session.max_players) {
          const err = new Error("Session is full");
          err.code = "SESSION_FULL";
          throw err;
        }

        await client.query(
          "INSERT INTO session_players (session_id, user_id) VALUES ($1, $2)",
          [sessionId, req.userId]
        );

        return { player_count: countResult.rows[0].player_count + 1 };
      });

      return res.json({ ok: true, player_count: result.player_count });
    } catch (err) {
      if (err.code === "SESSION_NOT_FOUND") {
        return res.status(404).json({ ok: false, message: "Session not found" });
      }
      if (err.code === "SESSION_FULL") {
        return res.status(409).json({ ok: false, message: "Session is full" });
      }
      if (err.code === "ALREADY_JOINED") {
        return res.status(409).json({ ok: false, message: "Already joined this session" });
      }
      console.error("Join session error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Leave a session (auth required)
  app.post("/sessions/:id/leave", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      // Check if user is the creator — creators can't leave, they must cancel
      const sessionCheck = await pool.query(
        "SELECT created_by FROM sessions WHERE id = $1",
        [sessionId]
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ ok: false, message: "Session not found" });
      }

      if (sessionCheck.rows[0].created_by === req.userId) {
        return res.status(400).json({ ok: false, message: "Session creator cannot leave. Cancel the session instead." });
      }

      const result = await pool.query(
        "DELETE FROM session_players WHERE session_id = $1 AND user_id = $2 RETURNING id",
        [sessionId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ ok: false, message: "You are not in this session" });
      }

      return res.json({ ok: true, message: "Left session" });
    } catch (err) {
      console.error("Leave session error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Cancel a session (auth required, creator only)
  app.delete("/sessions/:id", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ ok: false, message: "Invalid session ID" });
    }

    try {
      const result = await pool.query(
        "DELETE FROM sessions WHERE id = $1 AND created_by = $2 RETURNING id",
        [sessionId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ ok: false, message: "Not found or not the creator" });
      }

      return res.json({ ok: true, message: "Session cancelled" });
    } catch (err) {
      console.error("Cancel session error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}
