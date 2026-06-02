// src/routes/admin.js
// Abuse-response tooling for an admin user: see who's registered, see active
// sessions, ban a user (blocks login + new sessions), and force-kill a running
// session's container. This is the "kill switch" providers expect you to have.

import express from "express";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { killContainer } from "../lib/sandbox.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /admin/users
router.get("/users", async (req, res) => {
  const users = await User.find()
    .select("email role banned bannedReason emailVerified createdAt lastLoginAt")
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ users });
});

// GET /admin/sessions/active
router.get("/sessions/active", async (req, res) => {
  const sessions = await Session.find({ status: "active" })
    .select("userId kind containerId startedAt cols rows")
    .sort({ startedAt: -1 });
  res.json({ sessions });
});

// POST /admin/users/:id/ban { reason? }
router.post("/users/:id/ban", async (req, res) => {
  const u = await User.findByIdAndUpdate(
    req.params.id,
    { banned: true, bannedReason: req.body?.reason || null },
    { new: true }
  ).select("email banned bannedReason");
  if (!u) return res.status(404).json({ error: "not found" });

  // Kill any active sessions the banned user has.
  const active = await Session.find({ userId: req.params.id, status: "active" });
  for (const s of active) {
    if (s.containerId) killContainer(s.containerId);
    s.status = "ended";
    s.endedAt = new Date();
    await s.save().catch(() => {});
  }
  res.json({ user: u, killedSessions: active.length });
});

// POST /admin/users/:id/unban
router.post("/users/:id/unban", async (req, res) => {
  const u = await User.findByIdAndUpdate(
    req.params.id,
    { banned: false, bannedReason: null },
    { new: true }
  ).select("email banned");
  if (!u) return res.status(404).json({ error: "not found" });
  res.json({ user: u });
});

// POST /admin/sessions/:id/kill — force-kill one session's container
router.post("/sessions/:id/kill", async (req, res) => {
  const s = await Session.findById(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  if (s.containerId) killContainer(s.containerId);
  s.status = "ended";
  s.endedAt = new Date();
  await s.save().catch(() => {});
  res.json({ ok: true });
});

export default router;
