import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "./auth.js";
import { sendEmail } from "./mailer.js";


dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in environment variables");
}


const app = express();

app.use(cors());
app.use(express.json());

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


    return res.json({ 
      ok: true, 
      message: "Registration successful",
      needsEmailVerification: true,
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
      "SELECT id, username, email, created_at FROM users WHERE id = $1",
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

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});