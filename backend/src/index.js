import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "./auth.js";
import { sendEmail } from "./mailer.js";
import { sessionRoutes } from "./sessions.js";
import questionnaireRouter from "./questionnaire.js";
import { postRoutes } from "./posts.js";
import { createServer } from "http";    
import { Server } from "socket.io";
import friendsRoutes from "./friends.js";
import { initChatLogic, chatRoutes } from "./chat.js";
import { ratingRoutes } from "./ratings.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

dotenv.config();

const requiredEnv = [
  "JWT_SECRET",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing in environment variables`);
  }
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile app) or frontend Vercel URL only
    if (!origin || origin === process.env.FRONTEND_URL || process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use("/api", questionnaireRouter);
app.use("/api/friends", friendsRoutes);

postRoutes(app);
ratingRoutes(app);
sessionRoutes(app);
chatRoutes(app, requireAuth); 
initChatLogic(io);

// Health check
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// registration endpoint
app.post("/auth/register", async (req, res) => {
  let { username, email, password } = req.body;
  username = typeof username === "string" ? username.trim() : "";
  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  

  if (!username || !email || !password) {
    return res.status(400).json({ 
      ok: false, 
      message: "Username, email, and password required." 
    });
  }

  if (username.length < 3) {
    return res.status(400).json({ 
      ok: false,
      message: "Username must be at least 3 characters."
    });
  }
  
  if (!email.includes("@")) {
    return res.status(400).json({ ok: false, message: "Please enter a valid email." });
  }
  
  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      message: "Password must be at least 8 characters."
    });
  }

  try {
    // Check if username and email already exist
    const existingUsername = await pool.query(
      "SELECT 1 FROM users WHERE username = $1",
      [username]
    );

    const existingEmail = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );

    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ 
        ok: false, 
        message: "Username already exists" 
      });
    }

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ 
        ok: false, 
        message: "Email already exists" 
      });
    }    



    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, password_hash]
    );

    const newUser = result.rows[0];
    const userId = newUser.id;
    const userEmail = newUser.email;

    // Automatically create user profile after registration
    await pool.query(
      "INSERT INTO player_profile (user_id) VALUES ($1)",
      [userId]
    );

    // Email verification code for registration (new users only)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);
    await pool.query(
      "INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3)",
      [userId, codeHash, expiresAt]
    );
    try {
      await sendEmail({
        to: userEmail,
        subject: 'Your verification code',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <p>Hi ${newUser.username},</p>
            <p>Your verification code is:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
              ${code}
            </div>
            <p style="color:#666;">This code expires in 10 minutes.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Verification email failed:", err);
    }

    const accessToken = jwt.sign(
      { sub: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    return res.json({ 
      ok: true, 
      message: "Registration successful",
      needsEmailVerification: true,
      accessToken,
      user: newUser,
    });

  } catch (err) {
    if (err.code === "23505") {
      if (err.constraint === "users_username_unique") {
        return res.status(409).json({ ok: false, message: "Username already exists" });
      }

      if (err.constraint === "users_email_unique") {
        return res.status(409).json({ ok: false, message: "Email already exists" });
      }

      return res.status(409).json({ 
        ok: false, 
        message: "Username or email already exists" 
      });
    }

    console.error(err);
    return res.status(500).json({ 
      ok: false, 
      message: "Server error during registration" 
    });
  }
});

// Check username availability 
app.get("/auth/check-username", async (req, res) => {
  const username = typeof req.query.username === "string" ? req.query.username.trim() : "";

  // Guard: empty or too short usernames
  if (!username || username.length < 3) {
    return res.json({ ok: true, available: false });
  }

  try {
    const result = await pool.query(
      "SELECT 1 FROM users WHERE username = $1",
      [username]
    );

    res.json({
      ok: true,
      available: result.rows.length === 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});


// Verify email (code)
app.post("/auth/verify-email", async (req, res) => {
  let { email,code } = req.body;

  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  code = typeof code === "string" ? code.trim() : "";

  if (!email || !code) {
    return res.status(400).json({ ok: false, message: "Email and code required" });
  }

  if (code.length !== 6) {
    return res.status(400).json({ ok: false, message: "Code must be 6 digits" });
  }

  try {
    // 1.Find user
    const userResult = await pool.query(
      "SELECT id, email_verified FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ ok: false, message: "Invalid code or expired" });
    }

    const user = userResult.rows[0];
    
    if (user.email_verified) {
      return res.json({ ok: true, message: "Email already verified" });
    }
    // 2. Hash submitted code
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // 3. Check code in email_verifications and expiry
    const v = await pool.query(
      `SELECT user_id FROM email_verifications
       WHERE user_id = $1 AND code_hash = $2 AND expires_at > NOW()`,
      [user.id, codeHash]
    );

    if (v.rows.length === 0) {
      return res.status(400).json({ok: false, message: "Invalid code or expired" });
    }

    // 4. Mark verified
    await pool.query (
      "UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE id = $1",
      [user.id]
    );

    // 5. Delete the verification row since it is for one-time use
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [user.id]);

    return res.json({ ok: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify email error:", err);
    return res.status(500).json({ok: false, message: "Server error"});
  }
});


// Resend verification code
app.post("/auth/resend-verification", async (req, res) => {
  let { email } = req.body;
  email = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!email) {
    return res.status(400).json({ ok: false, message: "Email required" });
  }

  try {
    // Find user
    const userResult = await pool.query(
      "SELECT id, username, email, email_verified FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ ok: true, message: "If that email is registered, a code has been sent." });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.json({ ok: true, message: "Email already verified" });
    }

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete old code and insert new one
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [user.id]);
    await pool.query(
      "INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, codeHash, expiresAt]
    );

    // Send email
    await sendEmail({
      to: email,
      subject: 'Your verification code',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <p>Hi ${user.username},</p>
          <p>Your verification code is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
            ${code}
          </div>
          <p style="color:#666;">This code expires in 10 minutes.</p>
        </div>
      `,
    });

    return res.json({ ok: true, message: "If that email is registered, a code has been sent." });
  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});


// login endpoint
app.post("/auth/login", async (req, res) => {
  let { identifier, password } = req.body;
  identifier = typeof identifier === "string" ? identifier.trim() : "";
  if (identifier.includes("@")) identifier = identifier.toLowerCase();

  if (!identifier || !password) {
    return res.status(400).json({ 
      ok: false, 
      message: "username and password required" 
    });
  }

  try {
    // Query user by username or email
    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1",
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        ok: false, 
        message: "Invalid credentials" 
      });
    }

    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        ok: false, 
        message: "Invalid credentials" 
      });
    }

    // Generate JWT 
    const accessToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    // Return token and user info
    return res.json({ 
      ok: true, 
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      ok: false, 
      message: "Server error" 
    });
  }
});


app.get("/me", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, pp.questionnaire_done
      FROM users u
      LEFT JOIN player_profile pp ON pp.user_id = u.id
      WHERE u.id = $1`,
      [req.userId]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "User not found",
      });
    }

    return res.json({
      ok: true,
      user: r.rows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  }
});

// Forgot password
app.post("/auth/forgot-password", async (req, res) => {
  let { identifier } = req.body;
  identifier = typeof identifier === "string" ? identifier.trim() : "";
  if (identifier.includes("@")) identifier = identifier.toLowerCase();

  if (!identifier) {
    return res.status(400).json({ ok: false, message: "Email or username required" });
  }

  try {
    // Check if user exists
    const userResult = await pool.query(
      "SELECT id, email, username FROM users WHERE email = $1 OR username = $1",
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.json({ ok: true, message: "If that account is registered, a reset link has been sent." });
    }

    const user = userResult.rows[0];
    const userId = user.id;
    const userEmail = user.email;

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    // Only one active reset token per user (delete existing)
    await pool.query(
      "DELETE FROM password_resets WHERE user_id = $1",
      [userId]
    );

    // Store new reset token
    await pool.query(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [userId, tokenHash, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    // Send reset email
    await sendEmail({
      to: userEmail,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${user.username},</p>
          <p>You requested a password reset for your account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${resetLink}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link expires in 30 minutes.<br>
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Password reset email sent to:", userEmail);
    res.json({ ok: true, message: "If that account is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Reset password
app.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ ok: false, message: "Token and new password required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      ok: false,
      message: "Password must be at least 8 characters."
    });
  }

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetResult = await pool.query(
      `SELECT * FROM password_resets
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    if (resetResult.rows.length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid or expired token" });
    }

    const reset = resetResult.rows[0];
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [password_hash, reset.user_id]
    );

    await pool.query("DELETE FROM password_resets WHERE user_id = $1", [
      reset.user_id,
    ]);

    res.json({ ok: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

app.delete("/auth/delete-account", requireAuth, async (req, res) => {
  const userId = req.userId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get profile_id from user_id
    const profileRes = await client.query(
      "SELECT id FROM player_profile WHERE user_id = $1",
      [userId]
    );

    if (profileRes.rows.length > 0) {
      const profileId = profileRes.rows[0]?.id;

    // 2. Delete post-related data using profile_id
      await client.query("DELETE FROM post_likes WHERE profile_id = $1", [profileId]);
      await client.query("DELETE FROM post_comments WHERE profile_id = $1", [profileId]);
      await client.query("DELETE FROM posts WHERE profile_id = $1", [profileId]);
    }

    // 3. Delete other user-related data
    await client.query("DELETE FROM friends WHERE requester_id = $1 OR requested_id = $1", [userId]);

    await client.query("DELETE FROM recent_searches WHERE searcher_id = $1", [userId]);

    await client.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM email_verifications WHERE user_id = $1", [userId]);

    await client.query("DELETE FROM conversation_participants WHERE user_id = $1", [userId]);

    await client.query(`
      DELETE FROM conversations
      WHERE id NOT IN (
        SELECT conversation_id FROM conversation_participants
      )
    `);
    // 4. Delete profile
    await client.query("DELETE FROM player_profile WHERE user_id = $1", [userId]);

    // 5. Delete user
    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");

    return res.json({
      ok: true,
      message: "Account deleted successfully",
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete account error:", err);

    return res.status(500).json({
      ok: false,
      message: "Failed to delete account",
    });
  } finally {
    client.release();
  }
});


// Get all venues with active sessions (public)
app.get("/venues", async (req, res) => {
  try {
    const venueResult = await pool.query(
      "SELECT id AS venue_id, venue_name, latitude, longitude, court_count, rating, review_count, thumbnail_url, tags, condition_label FROM venues ORDER BY rating DESC"
    );

    const sessionResult = await pool.query(
      `SELECT
         s.venue_id,
         s.id AS session_id,
         s.sport,
         s.session_name,
         s.skill_level,
         s.max_players,
         s.start_time,
         s.end_time,
         COUNT(sp.id)::int AS player_count
       FROM sessions s
       LEFT JOIN session_players sp ON sp.session_id = s.id
       WHERE s.end_time > NOW()
       GROUP BY s.id
       ORDER BY s.start_time ASC`
    );

    const sessionsByVenue = {};
    for (const s of sessionResult.rows) {
      if (!sessionsByVenue[s.venue_id]) sessionsByVenue[s.venue_id] = [];
      sessionsByVenue[s.venue_id].push({
        session_id: s.session_id,
        sport: s.sport,
        session_name: s.session_name,
        skill_level: s.skill_level,
        player_count: s.player_count,
        max_players: s.max_players,
        start_time: s.start_time,
        end_time: s.end_time,
      });
    }

    const venues = venueResult.rows.map(v => {
      const sessions = sessionsByVenue[v.venue_id] || [];
      const totalPlayers = sessions.reduce((sum, s) => sum + s.player_count, 0);
      return {
        ...v,
        rating: parseFloat(v.rating),
        distance_km: 0,
        player_count: totalPlayers,
        active_sessions: sessions,
      };
    });

    return res.json({ ok: true, venues });
  } catch (err) {
    console.error("Venues fetch error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// upload avatar
app.post("/upload/avatar", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const file = req.file;

    const key = `avatars/${req.userId}-${Date.now()}-${file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      })
    );

    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    await pool.query(
      `UPDATE player_profile 
       SET avatar_url = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [imageUrl, req.userId]
    );

    return res.json({
      ok: true,
      url: imageUrl,
    });

  } catch (err) {
    console.error("S3 upload error:", err);
    return res.status(500).json({
      ok: false,
      message: "Upload failed",
    });
  }
});

// Get user profile
app.get("/profile/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, u.username, u.email
       FROM player_profile pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Profile not found",
        needsOnboarding: true
      });
    }

    return res.json({ ok: true, profile: result.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Update profile fields
app.patch("/profile/me", requireAuth, async (req, res) => {
  const { age, mbti_type } = req.body;
  const updates = [];
  const values = [];
  let idx = 1;

  if (age !== undefined) {
    const parsed = parseInt(age, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 120) {
      return res.status(400).json({ ok: false, message: "Age must be between 1 and 120" });
    }
    updates.push(`age = $${idx++}`);
    values.push(parsed);
  }

  if (mbti_type !== undefined) {
    const valid = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
    if (!valid.includes(mbti_type)) {
      return res.status(400).json({ ok: false, message: "Invalid MBTI type" });
    }
    updates.push(`mbti_type = $${idx++}`);
    values.push(mbti_type);
  }

  if (updates.length === 0) {
    return res.status(400).json({ ok: false, message: "Nothing to update" });
  }

  values.push(req.userId);
  try {
    await pool.query(
      `UPDATE player_profile SET ${updates.join(", ")}, updated_at = NOW() WHERE user_id = $${idx}`,
      values
    );
    return res.json({ ok: true, message: "Profile updated" });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Search users (for the Community tab)
app.get("/api/users/search", requireAuth, async (req, res) => {
  const { q } = req.query;
  
  if (!q) return res.json({ ok: true, users: [] });

  try {
    const result = await pool.query(
      `SELECT 
         u.id, 
         u.username, 
         pp.avatar_url,
         (SELECT status FROM friends 
          WHERE (requester_id = $1 AND requested_id = u.id) 
             OR (requester_id = u.id AND requested_id = $1)
         ) as friend_status
       FROM users u
       LEFT JOIN player_profile pp ON pp.user_id = u.id
       WHERE u.username ILIKE $2 AND u.id != $1
       LIMIT 20`,
      [req.userId, `%${q}%`]
    );

    res.json({ ok: true, users: result.rows });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Fetch recent searches
app.get("/api/search/recent", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, pp.avatar_url
       FROM recent_searches rs
       JOIN users u ON u.id = rs.searched_id
       LEFT JOIN player_profile pp ON pp.user_id = u.id
       WHERE rs.searcher_id = $1
       ORDER BY rs.searched_at DESC
       LIMIT 10`,
      [req.userId]
    );
    res.json({ ok: true, recents: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Save recent searches
app.post("/api/search/recent", requireAuth, async (req, res) => {
  const { searched_id } = req.body;

  if (!searched_id) {
    return res.status(400).json({ ok: false, message: "searched_id required" });
  }

  try {
    await pool.query(
      `INSERT INTO recent_searches (searcher_id, searched_id, searched_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (searcher_id, searched_id)
       DO UPDATE SET searched_at = NOW()`,
      [req.userId, searched_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Remove one recent search
app.delete("/api/search/recent/:searched_id", requireAuth, async (req, res) => {
  const { searched_id } = req.params;

  try {
    await pool.query(
      `DELETE FROM recent_searches 
       WHERE searcher_id = $1 AND searched_id = $2`,
      [req.userId, searched_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});