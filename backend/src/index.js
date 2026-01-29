import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "./auth.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}


const app = express();

app.use(cors());
app.use(express.json());

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ 
      ok: false, 
      message: "username, email, full name, and password required" 
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      message: "Password must be at least 8 characters."
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT 1 FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        message: "Username or email already exists" 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, created_at",
      [username, email, password_hash, fullName]
    );

    return res.json({ 
      ok: true, 
      message: "Registration successful",
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      ok: false, 
      message: "Server error during registration" 
    });
  }
});

// Check username availability 
app.get("/auth/check-username", async (req, res) => {
  const { username } = req.query;

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

// login endpoint
app.post("/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ 
      ok: false, 
      message: "username and password required" 
    });
  }

  try {
    // Query user by username or email
    const result = await pool.query(
      "SELECT id, username, email, full_name, password_hash FROM users WHERE username = $1 OR email = $1",
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
        fullName: user.full_name,
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
      "SELECT id, username, email, full_name, created_at FROM users WHERE id = $1",
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
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ ok: false, message: "Email or username required" });
  }

  try {
    // Check if user exists
    const userResult = await pool.query(
      "SELECT id, email, username, full_name FROM users WHERE email = $1 OR username = $1",
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

    // Send email with Resend
    await resend.emails.send({
      from: 'Spike <onboarding@resend.dev>',
      to: userEmail,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${user.full_name || user.username},</p>
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

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});