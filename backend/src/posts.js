import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

export function postRoutes(app) {
  // Get all posts (feed)
  app.get("/posts", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          p.id,
          p.content,
          p.tag,
          p.image_url,
          p.likes_count,
          p.comments_count,
          p.created_at,
          pp.id AS profile_id,
          u.username,
          pp.avatar_url,
          EXISTS (
            SELECT 1 FROM post_likes pl 
            WHERE pl.post_id = p.id 
            AND pl.profile_id = (
              SELECT id FROM player_profile WHERE user_id = $1
            )
          ) AS liked
         FROM posts p
         JOIN player_profile pp ON pp.id = p.profile_id
         JOIN users u ON u.id = pp.user_id
         ORDER BY p.created_at DESC`,
        [req.userId]
      );

      return res.json({ ok: true, posts: result.rows });
    } catch (err) {
      console.error("Get posts error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Create post
  app.post("/posts", requireAuth, async (req, res) => {
    const { content, tag, image_url } = req.body;

    if (!content) {
      return res.status(400).json({ ok: false, message: "Content required" });
    }

    try {
      const profileResult = await pool.query(
        "SELECT id FROM player_profile WHERE user_id = $1",
        [req.userId]
      );

      const profileId = profileResult.rows[0].id;

      const result = await pool.query(
        `INSERT INTO posts (profile_id, content, tag, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [profileId, content, tag || null, image_url || null]
      );

      return res.json({ ok: true, post: result.rows[0] });
    } catch (err) {
      console.error("Create post error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Like / unlike post
  app.post("/posts/:id/like", requireAuth, async (req, res) => {
    const postId = req.params.id;

    try {
      const profileResult = await pool.query(
        "SELECT id FROM player_profile WHERE user_id = $1",
        [req.userId]
      );
      const profileId = profileResult.rows[0].id;

      const existing = await pool.query(
        "SELECT id FROM post_likes WHERE post_id = $1 AND profile_id = $2",
        [postId, profileId]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          "DELETE FROM post_likes WHERE post_id = $1 AND profile_id = $2",
          [postId, profileId]
        );
        await pool.query(
          "UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1",
          [postId]
        );
        return res.json({ ok: true, liked: false });
      } else {
        await pool.query(
          "INSERT INTO post_likes (post_id, profile_id) VALUES ($1, $2)",
          [postId, profileId]
        );
        await pool.query(
          "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
          [postId]
        );
        return res.json({ ok: true, liked: true });
      }
    } catch (err) {
      console.error("Like post error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Get comments
  app.get("/posts/:id/comments", requireAuth, async (req, res) => {
    const postId = req.params.id;

    try {
      const result = await pool.query(
        `SELECT 
          c.id,
          c.content,
          c.created_at,
          u.username,
          pp.avatar_url
         FROM post_comments c
         JOIN player_profile pp ON pp.id = c.profile_id
         JOIN users u ON u.id = pp.user_id
         WHERE c.post_id = $1
         ORDER BY c.created_at ASC`,
        [postId]
      );

      return res.json({ ok: true, comments: result.rows });
    } catch (err) {
      console.error("Get comments error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Add comment
  app.post("/posts/:id/comments", requireAuth, async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ ok: false, message: "Content required" });
    }

    try {
      const profileResult = await pool.query(
        "SELECT id FROM player_profile WHERE user_id = $1",
        [req.userId]
      );
      const profileId = profileResult.rows[0].id;

      const result = await pool.query(
        `INSERT INTO post_comments (post_id, profile_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, profileId, content]
      );

      await pool.query(
        "UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1",
        [postId]
      );

      return res.json({ ok: true, comment: result.rows[0] });
    } catch (err) {
      console.error("Add comment error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}