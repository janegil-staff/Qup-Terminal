// src/middleware/rateLimit.js
// Per-IP rate limiters. Auth endpoints are the brute-force / credential-stuffing
// surface; the general limiter protects everything else. Tune via env.

import rateLimit from "express-rate-limit";

// Auth: tight. Default 10 attempts / 15 min / IP.
export const authLimiter = rateLimit({
  windowMs: Number(process.env.RL_AUTH_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RL_AUTH_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

// General API: looser. Default 100 / 15 min / IP.
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RL_API_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RL_API_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
});
