// src/routes/auth.js
// Register / login / refresh / me. bcryptjs for hashing (existing pattern).

import express from "express";
import bcrypt from "bcryptjs";

import { User } from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../lib/tokens.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// POST /auth/register { email, password }
router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: "invalid email" });
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "password must be ≥ 8 chars" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email: email.toLowerCase(), passwordHash });

  return res.status(201).json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: { id: user._id, email: user.email, language: user.language },
  });
});

// POST /auth/login { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  user.lastLoginAt = new Date();
  await user.save();

  return res.json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: { id: user._id, email: user.email, language: user.language },
  });
});

// POST /auth/refresh { refreshToken }
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });
  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "invalid refresh token" });
  }
  if (payload.kind !== "refresh") {
    return res.status(401).json({ error: "wrong token kind" });
  }
  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ error: "user not found" });

  return res.json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select(
    "email language settings createdAt lastLoginAt"
  );
  if (!user) return res.status(404).json({ error: "not found" });
  return res.json({ user });
});

export default router;
