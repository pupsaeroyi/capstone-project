import express from "express";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

// Ensure schema pieces this router depends on exist.
// Safe to call many times — all statements are IF NOT EXISTS.
export async function ensureNotificationsSchema() {
  try {
    await pool.query(
      `ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()`
    );
    await pool.query(
      `ALTER TABLE player_profile ADD COLUMN IF NOT EXISTS notifications_last_read_at TIMESTAMP NOT NULL DEFAULT NOW()`
    );
  } catch (err) {
    console.error("ensureNotificationsSchema error:", err);
  }
}

// Build the combined notification feed for the current user.
// Types: "friend_request", "like", "comment".
async function buildFeed(userId) {
  const profileResult = await pool.query(
    "SELECT id, notifications_last_read_at FROM player_profile WHERE user_id = $1",
    [userId]
  );

  if (profileResult.rows.length === 0) {
    return { items: [], lastReadAt: new Date(0) };
  }

  const myProfileId = profileResult.rows[0].id;
  const lastReadAt = profileResult.rows[0].notifications_last_read_at;

  // Friend requests received (still pending)
  const frq = await pool.query(
    `SELECT
       f.id AS id,
       'friend_request' AS type,
       u.id AS actor_user_id,
       u.username AS actor_username,
       pp.avatar_url AS actor_avatar,
       NULL::int AS post_id,
       NULL::text AS post_preview,
       NULL::text AS comment_preview,
       f.created_at AS created_at
     FROM friends f
     JOIN users u ON u.id = f.requester_id
     LEFT JOIN player_profile pp ON pp.user_id = u.id
     WHERE f.requested_id = $1 AND f.status = 'pending'`,
    [userId]
  );

  // Likes on my posts (from someone else)
  const likes = await pool.query(
    `SELECT
       pl.id AS id,
       'like' AS type,
       u.id AS actor_user_id,
       u.username AS actor_username,
       lpp.avatar_url AS actor_avatar,
       p.id AS post_id,
       LEFT(p.content, 80) AS post_preview,
       NULL::text AS comment_preview,
       pl.created_at AS created_at
     FROM post_likes pl
     JOIN posts p ON p.id = pl.post_id
     JOIN player_profile lpp ON lpp.id = pl.profile_id
     JOIN users u ON u.id = lpp.user_id
     WHERE p.profile_id = $1 AND pl.profile_id != $1`,
    [myProfileId]
  );

  // Comments on my posts (from someone else)
  const comments = await pool.query(
    `SELECT
       c.id AS id,
       'comment' AS type,
       u.id AS actor_user_id,
       u.username AS actor_username,
       cpp.avatar_url AS actor_avatar,
       p.id AS post_id,
       LEFT(p.content, 80) AS post_preview,
       LEFT(c.content, 120) AS comment_preview,
       c.created_at AS created_at
     FROM post_comments c
     JOIN posts p ON p.id = c.post_id
     JOIN player_profile cpp ON cpp.id = c.profile_id
     JOIN users u ON u.id = cpp.user_id
     WHERE p.profile_id = $1 AND c.profile_id != $1`,
    [myProfileId]
  );

  const items = [...frq.rows, ...likes.rows, ...comments.rows].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return { items, lastReadAt };
}

// List notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const { items, lastReadAt } = await buildFeed(req.userId);
    const lastReadMs = new Date(lastReadAt).getTime();

    const annotated = items.map((n) => ({
      ...n,
      unread: new Date(n.created_at).getTime() > lastReadMs,
    }));

    res.json({ ok: true, notifications: annotated });
  } catch (err) {
    console.error("Notifications list error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Unread count (for the red dot)
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const { items, lastReadAt } = await buildFeed(req.userId);
    const lastReadMs = new Date(lastReadAt).getTime();
    const count = items.filter(
      (n) => new Date(n.created_at).getTime() > lastReadMs
    ).length;
    res.json({ ok: true, count });
  } catch (err) {
    console.error("Notifications unread-count error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Mark everything as read (bump last_read_at to now)
router.post("/mark-read", requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE player_profile
       SET notifications_last_read_at = NOW()
       WHERE user_id = $1`,
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Notifications mark-read error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
