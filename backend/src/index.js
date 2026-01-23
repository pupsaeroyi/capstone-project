import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { pool } from "./db.js";

const app = express();

app.use(cors());               // allow requests from your mobile app
app.use(express.json());       // parse JSON bodies

// simple health check
app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// TEMP login endpoint (replace with your real logic)
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // TODO: replace with real query + password hashing check
  // This is just a placeholder so you can test end-to-end connectivity.
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "email and password required" });
  }

  return res.json({ ok: true, message: "Login endpoint reached", email });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
});
