// src/routes/lessons.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Session } from "../models/Session.js";
import { LESSONS, getLesson, verifyInContainer } from "../lib/lessons.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  res.json({
    lessons: LESSONS.map((l) => ({
      id: l.id,
      title: l.title,
      explanation: l.explanation,
      task: l.task,
      hint: l.hint,
    })),
  });
});

router.post("/:id/verify", async (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: "unknown lesson" });
  const session = await Session.findOne({
    userId: req.userId,
    kind: "sandbox",
    status: "active",
  }).sort({ startedAt: -1 });
  if (!session || !session.containerId) {
    return res.status(409).json({
      error: "no_active_session",
      message: "Open a terminal session first, then check your work.",
    });
  }
  const result = await verifyInContainer(session.containerId, lesson);
  res.json({ passed: result.passed });
});

export default router;
