import express from "express";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

// Send a Friend Request
router.post("/request", requireAuth, async (req, res) => {
  const requesterId = req.userId; // Securely pulled from JWT
  const { requestedId } = req.body;

  if (requesterId === requestedId) {
    return res.status(400).json({ ok: false, message: "You cannot add yourself." });
  }

  try {
    const check = await pool.query(
      `SELECT * FROM friends WHERE (requester_id = $1 AND requested_id = $2) 
       OR (requester_id = $2 AND requested_id = $1)`,
      [requesterId, requestedId]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ ok: false, message: "Relationship already exists." });
    }

    await pool.query(
      `INSERT INTO friends (requester_id, requested_id, status) VALUES ($1, $2, 'pending')`,
      [requesterId, requestedId]
    );

    res.json({ ok: true, message: "Friend request sent!" });
  } catch (err) {
    console.error("Send friend request error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Accept a Friend Request
router.put("/accept", requireAuth, async (req, res) => {
  const requestedId = req.userId; // The person accepting the request
  const { requesterId } = req.body;

  try {
    const result = await pool.query(
      `UPDATE friends SET status = 'accepted' 
       WHERE requester_id = $1 AND requested_id = $2 RETURNING *`,
      [requesterId, requestedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Pending request not found." });
    }

    // Auto-create the conversation room
    await pool.query(
      `INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2)`,
      [requesterId, requestedId]
    );

    res.json({ ok: true, message: "Friend request accepted!" });
  } catch (err) {
    console.error("Accept friend request error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get pending friend requests sent to the current user
router.get("/pending", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         u.id AS requester_id,
         u.username,
         pp.avatar_url,
         f.created_at
       FROM friends f
       JOIN users u ON u.id = f.requester_id
       LEFT JOIN player_profile pp ON pp.user_id = u.id
       WHERE f.requested_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ ok: true, requests: result.rows });
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Reject or cancel a friend request / unfriend
router.delete("/:otherUserId", requireAuth, async (req, res) => {
  const userId = req.userId;
  const otherUserId = parseInt(req.params.otherUserId, 10);

  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ ok: false, message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM friends
       WHERE (requester_id = $1 AND requested_id = $2)
          OR (requester_id = $2 AND requested_id = $1)
       RETURNING id`,
      [userId, otherUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Friendship not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete friendship error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get friend relationship status with another user
router.get("/status/:otherUserId", requireAuth, async (req, res) => {
  const userId = req.userId;
  const otherUserId = parseInt(req.params.otherUserId, 10);

  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ ok: false, message: "Invalid user id" });
  }

  try {
    const result = await pool.query(
      `SELECT status, requester_id, requested_id
       FROM friends
       WHERE (requester_id = $1 AND requested_id = $2)
          OR (requester_id = $2 AND requested_id = $1)
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (result.rows.length === 0) {
      return res.json({ ok: true, status: "none", direction: null });
    }

    const row = result.rows[0];
    const direction = row.requester_id === userId ? "outgoing" : "incoming";
    res.json({ ok: true, status: row.status, direction });
  } catch (err) {
    console.error("Get friend status error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Get User's Accepted Friends List
router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    // Finds all accepted friends and retrieves the other user's profile info
    const result = await pool.query(
      `SELECT 
         f.id AS friendship_id,
         u.id AS friend_user_id,
         u.username,
         pp.avatar_url,
         c.id AS conversation_id
       FROM friends f
       JOIN users u ON (u.id = f.requester_id OR u.id = f.requested_id) AND u.id != $1
       LEFT JOIN player_profile pp ON pp.user_id = u.id
       LEFT JOIN conversations c ON (c.user1_id = $1 AND c.user2_id = u.id) OR (c.user1_id = u.id AND c.user2_id = $1)
       WHERE (f.requester_id = $1 OR f.requested_id = $1)
         AND f.status = 'accepted'`,
      [userId]
    );

    res.json({ ok: true, friends: result.rows });
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;