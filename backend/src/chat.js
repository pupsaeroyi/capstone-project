import { pool } from "./db.js";
import jwt from "jsonwebtoken";

// ─── Helper: verify JWT from socket handshake ───────────────────────────────
function getUserIdFromSocket(socket) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Ensure chat-related schema additions exist ─────────────────────────────
export async function ensureChatSchema() {
  try {
    await pool.query(
      `ALTER TABLE conversation_participants
       ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE`
    );
  } catch (err) {
    console.error("ensureChatSchema error:", err);
  }
}

// ─── REST helpers (called from index.js) ────────────────────────────────────
export function chatRoutes(app, requireAuth) {

  // ── Toggle pin on a conversation for the current user ────────────────────
  app.post("/conversations/:id/pin", requireAuth, async (req, res) => {
    const convId = parseInt(req.params.id, 10);
    if (!Number.isFinite(convId)) {
      return res.status(400).json({ ok: false, message: "Invalid conversation id" });
    }

    try {
      const result = await pool.query(
        `UPDATE conversation_participants
         SET is_pinned = NOT is_pinned
         WHERE conversation_id = $1 AND user_id = $2
         RETURNING is_pinned`,
        [convId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ ok: false, message: "Not a participant" });
      }

      return res.json({ ok: true, is_pinned: result.rows[0].is_pinned });
    } catch (err) {
      console.error("Toggle pin error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // ── Get or create a private conversation between two users ──────────────
  app.post("/conversations/direct", requireAuth, async (req, res) => {
    const { other_user_id } = req.body;
    if (!other_user_id) {
      return res.status(400).json({ ok: false, message: "other_user_id required" });
    }
    if (parseInt(other_user_id) === req.userId) {
      return res.status(400).json({ ok: false, message: "Cannot chat with yourself" });
    }

    try {
      // Check if conversation already exists
      const existing = await pool.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
         JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
         WHERE c.is_group = false
         LIMIT 1`,
        [req.userId, other_user_id]
      );

      if (existing.rows.length > 0) {
        return res.json({ ok: true, conversation_id: existing.rows[0].id });
      }

      // Create new conversation
      const convResult = await pool.query(
        `INSERT INTO conversations (is_group, created_at) VALUES (false, NOW()) RETURNING id`
      );
      const convId = convResult.rows[0].id;

      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [convId, req.userId, other_user_id]
      );

      return res.json({ ok: true, conversation_id: convId });
    } catch (err) {
      console.error("Create direct conversation error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // ── List all conversations for the current user ──────────────────────────
  app.get("/conversations", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           c.id AS conversation_id,
           c.is_group,
           COALESCE(cp.is_pinned, false) AS is_pinned,
           -- For group chats: chatroom name/session info
           cr.name AS group_name,
           cr.session_id,
           s.session_name,
           -- For private chats: the other user's info
           u.id   AS other_user_id,
           u.username AS other_username,
           pp.avatar_url AS other_avatar,
           -- Last message
           dm.content  AS last_message,
           dm.sent_at  AS last_message_at,
           dm.sender_id AS last_sender_id,
           -- Unread count
           (
             SELECT COUNT(*) FROM direct_messages dm2
             WHERE dm2.conversation_id = c.id
               AND dm2.sent_at > COALESCE(cp.last_read_at, '1970-01-01')
               AND dm2.sender_id != $1
           ) AS unread_count
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
         -- Group chat linkage
         LEFT JOIN chatrooms cr ON cr.id = c.chatroom_id
         LEFT JOIN sessions s ON s.id = cr.session_id
         -- Private chat: other participant
         LEFT JOIN conversation_participants cp2
           ON cp2.conversation_id = c.id AND cp2.user_id != $1 AND c.is_group = false
         LEFT JOIN users u ON u.id = cp2.user_id
         LEFT JOIN player_profile pp ON pp.user_id = u.id
         -- Last message
         LEFT JOIN LATERAL (
           SELECT content, sent_at, sender_id
           FROM direct_messages
           WHERE conversation_id = c.id
           ORDER BY sent_at DESC
           LIMIT 1
         ) dm ON true
         ORDER BY cp.is_pinned DESC, COALESCE(dm.sent_at, c.created_at) DESC`,
        [req.userId]
      );

      return res.json({ ok: true, conversations: result.rows });
    } catch (err) {
      console.error("List conversations error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // ── Get messages for a conversation (paginated) ──────────────────────────
  app.get("/conversations/:id/messages", requireAuth, async (req, res) => {
    const convId = parseInt(req.params.id, 10);
    const limit = parseInt(req.query.limit || "50", 10);
    const before = req.query.before; // message id cursor

    // Verify user is a participant
    try {
      const check = await pool.query(
        "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
        [convId, req.userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ ok: false, message: "Not a participant" });
      }

      const params = [convId, limit];
      let cursorClause = "";
      if (before) {
        params.push(before);
        cursorClause = `AND dm.id < $${params.length}`;
      }

      const result = await pool.query(
        `SELECT
           dm.id,
           dm.conversation_id,
           dm.sender_id,
           dm.content,
           dm.sent_at,
           dm.edited_at,
           u.username AS sender_username,
           pp.avatar_url AS sender_avatar
         FROM direct_messages dm
         JOIN users u ON u.id = dm.sender_id
         LEFT JOIN player_profile pp ON pp.user_id = dm.sender_id
         WHERE dm.conversation_id = $1 ${cursorClause}
         ORDER BY dm.sent_at DESC
         LIMIT $2`,
        params
      );

      // Mark as read
      await pool.query(
        `UPDATE conversation_participants SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [convId, req.userId]
      );

      return res.json({ ok: true, messages: result.rows.reverse() });
    } catch (err) {
      console.error("Get messages error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // ── Get conversation info (participants etc.) ────────────────────────────
  app.get("/conversations/:id", requireAuth, async (req, res) => {
    const convId = parseInt(req.params.id, 10);
    try {
      const check = await pool.query(
        "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
        [convId, req.userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ ok: false, message: "Not a participant" });
      }

      const convResult = await pool.query(
        `SELECT c.*, cr.name AS group_name, cr.session_id, s.session_name
         FROM conversations c
         LEFT JOIN chatrooms cr ON cr.id = c.chatroom_id
         LEFT JOIN sessions s ON s.id = cr.session_id
         WHERE c.id = $1`,
        [convId]
      );

      const participants = await pool.query(
        `SELECT u.id, u.username, pp.avatar_url
         FROM conversation_participants cp
         JOIN users u ON u.id = cp.user_id
         LEFT JOIN player_profile pp ON pp.user_id = u.id
         WHERE cp.conversation_id = $1`,
        [convId]
      );

      return res.json({
        ok: true,
        conversation: {
          ...convResult.rows[0],
          participants: participants.rows,
        },
      });
    } catch (err) {
      console.error("Get conversation error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}

// ─── Auto-create chatroom when session is created ───────────────────────────
// Call this from sessions.js after INSERT INTO sessions
export async function createSessionChatroom(client, sessionId, sessionName, creatorId) {
  // 1. Create chatroom row
  const crResult = await client.query(
    `INSERT INTO chatrooms (session_id, name, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
    [sessionId, sessionName || `Session #${sessionId}`]
  );
  const chatroomId = crResult.rows[0].id;

  // 2. Create a group conversation linked to chatroom
  const convResult = await client.query(
    `INSERT INTO conversations (is_group, chatroom_id, created_at) VALUES (true, $1, NOW()) RETURNING id`,
    [chatroomId]
  );
  const convId = convResult.rows[0].id;

  // 3. Add creator as participant
  await client.query(
    `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
    [convId, creatorId]
  );

  return { chatroomId, convId };
}

// ─── Add/remove user from session chatroom ───────────────────────────────────
export async function addUserToSessionChat(sessionId, userId) {
  try {
    // Find the conversation linked to this session's chatroom
    const result = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN chatrooms cr ON cr.id = c.chatroom_id
       WHERE cr.session_id = $1`,
      [sessionId]
    );
    if (result.rows.length === 0) return;
    const convId = result.rows[0].id;

    await pool.query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [convId, userId]
    );
  } catch (err) {
    console.error("addUserToSessionChat error:", err);
  }
}

export async function removeUserFromSessionChat(sessionId, userId) {
  try {
    const result = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN chatrooms cr ON cr.id = c.chatroom_id
       WHERE cr.session_id = $1`,
      [sessionId]
    );
    if (result.rows.length === 0) return;
    const convId = result.rows[0].id;

    await pool.query(
      `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [convId, userId]
    );
  } catch (err) {
    console.error("removeUserFromSessionChat error:", err);
  }
}

// ─── Socket.io real-time logic ───────────────────────────────────────────────
export function initChatLogic(io) {
  // Map: userId -> Set of socketIds (for presence)
  const onlineUsers = new Map();
  // Map: `${conversationId}:${userId}` -> timeout handle
  const typingTimers = new Map();

  io.on("connection", (socket) => {
    const userId = getUserIdFromSocket(socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    console.log(`Chat connected: userId=${userId} socketId=${socket.id}`);

    // Track online presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // ── Join a conversation room ────────────────────────────────────────────
    socket.on("join_conversation", async (conversationId) => {
      // Verify user is a participant
      try {
        const check = await pool.query(
          "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
          [conversationId, userId]
        );
        if (check.rows.length === 0) return;

        const room = `conv_${conversationId}`;
        socket.join(room);
        console.log(`userId=${userId} joined room ${room}`);
      } catch (err) {
        console.error("join_conversation error:", err);
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    // ── Send message ────────────────────────────────────────────────────────
    socket.on("send_message", async ({ conversationId, content }) => {
      if (!content?.trim()) return;

      try {
        // Verify participant
        const check = await pool.query(
          "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
          [conversationId, userId]
        );
        if (check.rows.length === 0) return;

        // Save message
        const result = await pool.query(
          `INSERT INTO direct_messages (conversation_id, sender_id, content, sent_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, conversation_id, sender_id, content, sent_at`,
          [conversationId, userId, content.trim()]
        );
        const msg = result.rows[0];

        // Get sender info
        const userResult = await pool.query(
          `SELECT u.username, pp.avatar_url
           FROM users u LEFT JOIN player_profile pp ON pp.user_id = u.id
           WHERE u.id = $1`,
          [userId]
        );
        const sender = userResult.rows[0] || {};

        const fullMsg = {
          ...msg,
          sender_username: sender.username,
          sender_avatar: sender.avatar_url,
        };

        // Broadcast to everyone in the room
        io.to(`conv_${conversationId}`).emit("new_message", fullMsg);

        // Clear typing indicator for this sender
        const typingKey = `${conversationId}:${userId}`;
        if (typingTimers.has(typingKey)) {
          clearTimeout(typingTimers.get(typingKey));
          typingTimers.delete(typingKey);
        }
        socket.to(`conv_${conversationId}`).emit("user_stop_typing", { userId, username: sender.username, conversationId });
      } catch (err) {
        console.error("send_message error:", err);
      }
    });

    // ── Typing indicators ───────────────────────────────────────────────────
    socket.on("typing", async ({ conversationId }) => {
      try {
        const userResult = await pool.query("SELECT username FROM users WHERE id = $1", [userId]);
        const username = userResult.rows[0]?.username;

        socket.to(`conv_${conversationId}`).emit("user_typing", { userId, username, conversationId });

        // Auto-stop after 3s inactivity
        const typingKey = `${conversationId}:${userId}`;
        if (typingTimers.has(typingKey)) clearTimeout(typingTimers.get(typingKey));
        typingTimers.set(
          typingKey,
          setTimeout(() => {
            socket.to(`conv_${conversationId}`).emit("user_stop_typing", { userId, username, conversationId });
            typingTimers.delete(typingKey);
          }, 3000)
        );
      } catch (err) {
        console.error("typing error:", err);
      }
    });

    socket.on("stop_typing", ({ conversationId }) => {
      const typingKey = `${conversationId}:${userId}`;
      if (typingTimers.has(typingKey)) {
        clearTimeout(typingTimers.get(typingKey));
        typingTimers.delete(typingKey);
      }
      socket.to(`conv_${conversationId}`).emit("user_stop_typing", { userId, conversationId });
    });

    // ── Mark messages as read ───────────────────────────────────────────────
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        await pool.query(
          `UPDATE conversation_participants SET last_read_at = NOW()
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId]
        );
        // Notify others in room (for read receipts)
        socket.to(`conv_${conversationId}`).emit("messages_read", { userId, conversationId });
      } catch (err) {
        console.error("mark_read error:", err);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      console.log(`Chat disconnected: userId=${userId}`);
    });
  });
}