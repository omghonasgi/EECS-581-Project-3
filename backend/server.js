// TripTrace backend - Requirement 1 (Arin Shah)
//   POST /api/register  { username, email, password }
//   POST /api/login     { username, password }  -> { token, user }
//   GET  /api/me        logged-in check example (needs Authorization: Bearer <token>)
//
// Settings come from backend/.env (DB_USER, DB_PASSWORD, JWT_SECRET, ...).
import "dotenv/config";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "triptrace",
});

const app = express();
app.use(cors());
app.use(express.json());

// Logged-in check. Put it in front of any route that needs a user:
//   app.get("/api/experiences", requireAuth, (req, res) => { ...req.user.id... })
export function requireAuth(req, res, next) {
  const token = (req.get("Authorization") || "").replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, username }
    next();
  } catch {
    res.status(401).json({ error: "You must be logged in." });
  }
}

app.post("/api/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim();
  const password = req.body.password || "";

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const [taken] = await db.query(
    "SELECT username, email FROM users WHERE username = ? OR email = ?",
    [username, email]
  );
  if (taken.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "That username is already taken." });
  }
  if (taken.length > 0) {
    return res.status(409).json({ error: "That email is already registered." });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [username, email, hash]
  );
  res.status(201).json({ message: "Account created. You can now log in." });
});

app.post("/api/login", async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";

  const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`TripTrace API on http://localhost:${port}`));
