import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

import { pool } from "./db.js";

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
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ 
      ok: false, 
      message: "username, email, fullName, and password required" 
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
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
      "SELECT * FROM users WHERE username = $1 OR email = $1",
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

    return res.json({ 
      ok: true, 
      message: "Login successful",
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

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});