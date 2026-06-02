// src/routes/auth.js
// Register / login / refresh / me. bcryptjs for hashing (existing pattern).

import express from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import { User } from "../models/User.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../lib/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../lib/email.js";

const router = express.Router();

const REQUIRE_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === "true";

function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// POST /auth/register { email, password }
router.post("/register", async (req, res) => {
  // Registration can be disabled (invite-only mode) via env.
  if (process.env.REGISTRATION_OPEN === "false") {
    return res.status(403).json({ error: "Registration is closed." });
  }
  const { email, password } = req.body || {};
  if (!isEmail(email)) return res.status(400).json({ error: "invalid email" });
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "password must be ≥ 8 chars" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const verifyTok = crypto.randomBytes(24).toString("hex");
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    emailVerified: !REQUIRE_VERIFICATION, // auto-verified if verification is off
    verifyToken: REQUIRE_VERIFICATION ? verifyTok : null,
    verifyTokenExpires: REQUIRE_VERIFICATION
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null,
  });

  if (REQUIRE_VERIFICATION) {
    try {
      await sendVerificationEmail(user.email, verifyTok);
    } catch (e) {
      console.error("verification email failed:", e.message);
    }
    return res.status(201).json({
      needsVerification: true,
      message: "Check your email to verify your account before signing in.",
    });
  }

  return res.status(201).json({
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: { id: user._id, email: user.email, language: user.language },
  });
});

// GET /auth/verify?token=...
router.get("/verify", async (req, res) => {
  const { token } = req.query || {};
  if (!token) return res.status(400).send("Missing token.");
  const user = await User.findOne({
    verifyToken: token,
    verifyTokenExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).send("Invalid or expired verification link.");
  user.emailVerified = true;
  user.verifyToken = null;
  user.verifyTokenExpires = null;
  await user.save();
  return res.send("Email verified. You can now sign in.");
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

  if (user.banned) {
    return res.status(403).json({ error: "Account suspended." });
  }
  if (REQUIRE_VERIFICATION && !user.emailVerified) {
    return res
      .status(403)
      .json({ error: "Please verify your email before signing in." });
  }

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
    "email language settings role emailVerified createdAt lastLoginAt"
  );
  if (!user) return res.status(404).json({ error: "not found" });
  return res.json({ user });
});

// DELETE /auth/me — account deletion (required by App Store / Play).
// Removes the user and their hosts + session records.
router.delete("/me", requireAuth, async (req, res) => {
  const { Host } = await import("../models/Host.js");
  const { Session } = await import("../models/Session.js");
  await Host.deleteMany({ userId: req.userId });
  await Session.deleteMany({ userId: req.userId });
  await User.findByIdAndDelete(req.userId);
  return res.json({ ok: true, deleted: true });
});

export default router;
