import { pool } from "./db.js";

export function initChatLogic(io) {
  io.on("connection", (socket) => {
    console.log("A user connected for chat:", socket.id);

    // Join specific chat room
    socket.on("join_chat", (conversationId) => {
      const roomName = `chat_${conversationId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined ${roomName}`);
    });

    // Typing Indicators
    socket.on("typing", ({ conversationId, username }) => {
      socket.to(`chat_${conversationId}`).emit("user_typing", { username });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(`chat_${conversationId}`).emit("user_stop_typing");
    });

    // Send and Save Message
    socket.on("send_message", async (data) => {
      const { conversationId, senderId, content } = data;

      try {
        // Save to Neon Database
        const result = await pool.query(
          `INSERT INTO direct_messages (conversation_id, sender_id, content) 
           VALUES ($1, $2, $3) RETURNING *`,
          [conversationId, senderId, content]
        );

        const savedMessage = result.rows[0];

        // Broadcast to everyone in the room (including sender) so their UI updates
        io.to(`chat_${conversationId}`).emit("receive_message", savedMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}