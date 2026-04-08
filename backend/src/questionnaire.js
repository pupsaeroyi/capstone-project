import express from "express";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

router.post("/submit-questionnaire", requireAuth, async (req, res) => {
  const {
    pos1,
    pos2,
    pos3,
    experience,
    often,
    uni_team,
    intensity,
    rule,
    serve,
    serve_receive,
    spike,
    spike_receive,
    set,
    block,
  } = req.body;

  if (!experience || !often || !uni_team || !intensity) {
    return res.status(400).json({ ok: false, message: "All fields required" });
  }

  try {
    // 1. Send to Python for scoring
    const pyRes = await fetch(`${process.env.PYTHON_SERVICE_URL}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pos1,
        pos2,
        pos3,
        experience,
        often,
        uni_team,
        intensity,
        rule,
        serve,
        serve_receive,
        spike,
        spike_receive,
        set,
        block,
      }),
    });

    const pyData = await pyRes.json();

    if (pyData.error) {
      return res.status(500).json({ ok: false, message: pyData.error });
    }

    const { rank, rating_score, total } = pyData;

    // 2. Get player_profile id for this user
    const profileResult = await pool.query(
      "SELECT id FROM player_profile WHERE user_id = $1",
      [req.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Player profile not found" });
    }

    const profileId = profileResult.rows[0].id;

    // 3. Save final answers to player_questionnaire (mark as not draft)
    await pool.query(
    `INSERT INTO player_questionnaire 
        (profile_id, pos1, pos2, pos3, experience, often, uni_team, intensity, rule, serve, 
        serve_receive, spike, spike_receive, set, block, is_draft)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, FALSE)
    ON CONFLICT (profile_id)
    DO UPDATE SET
        experience = EXCLUDED.experience,
        often = EXCLUDED.often,
        uni_team = EXCLUDED.uni_team,
        intensity = EXCLUDED.intensity,
        rule = EXCLUDED.rule,
        serve = EXCLUDED.serve,
        serve_receive = EXCLUDED.serve_receive,
        spike = EXCLUDED.spike,
        spike_receive = EXCLUDED.spike_receive,
        set = EXCLUDED.set,
        block = EXCLUDED.block,
        pos1 = EXCLUDED.pos1,
        pos2 = EXCLUDED.pos2,
        pos3 = EXCLUDED.pos3,
        is_draft = FALSE`,
    [profileId, pos1, pos2, pos3, experience, often, uni_team, intensity, rule, serve,
    serve_receive, spike, spike_receive, set, block]
    );

    // 4. Update player_profile with rank and rating
    await pool.query(
      `UPDATE player_profile 
       SET rank = $1, rating_score = $2, total_score = $3, pos1 = $4, pos2 = $5, pos3 = $6, questionnaire_done = TRUE
       WHERE id = $7`,
      [rank, rating_score, total, pos1, pos2, pos3, profileId]
    );

    return res.json({ ok: true, rank, rating_score });

  } catch (err) {
    console.error("Questionnaire submit error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});


// Save draft progress
router.post("/questionnaire/save-draft", requireAuth, async (req, res) => {
  const { answers, current_step } = req.body;

  try {
    const profileResult = await pool.query(
      "SELECT id FROM player_profile WHERE user_id = $1",
      [req.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Player profile not found" });
    }

    const profileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO player_questionnaire 
        (profile_id, pos1, pos2, pos3, experience, often, uni_team, intensity, rule, serve,
         serve_receive, spike, spike_receive, set, block, current_step, is_draft)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, TRUE)
       ON CONFLICT (profile_id) 
       DO UPDATE SET
         experience = EXCLUDED.experience,
         often = EXCLUDED.often,
         uni_team = EXCLUDED.uni_team,
         intensity = EXCLUDED.intensity,
         rule = EXCLUDED.rule,
         serve = EXCLUDED.serve,
         serve_receive = EXCLUDED.serve_receive,
         spike = EXCLUDED.spike,
         spike_receive = EXCLUDED.spike_receive,
         set = EXCLUDED.set,
         block = EXCLUDED.block,
         current_step = EXCLUDED.current_step`,
      [
        profileId,
        answers.pos1 || null,
        answers.pos2 || null,
        answers.pos3 || null,
        answers.experience || null,
        answers.often || null,
        answers.uni_team || null,
        answers.intensity || null,
        answers.rule ?? null,
        answers.serve ?? null,
        answers.serve_receive ?? null,
        answers.spike ?? null,
        answers.spike_receive ?? null,
        answers.set ?? null,
        answers.block ?? null,
        current_step,
      ]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("Save draft error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Load draft progress
router.get("/questionnaire/draft", requireAuth, async (req, res) => {
  try {
    const profileResult = await pool.query(
      "SELECT id FROM player_profile WHERE user_id = $1",
      [req.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Player profile not found" });
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(
      "SELECT * FROM player_questionnaire WHERE profile_id = $1 AND is_draft = TRUE",
      [profileId]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: true, draft: null });
    }

    return res.json({ ok: true, draft: result.rows[0] });
  } catch (err) {
    console.error("Load draft error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;