// src/lib/tokens.js
// JWT sign/verify for access + refresh tokens. Mirrors the Recover/Coachly
// pattern: short-lived access token, longer refresh token.
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

const ACCESS_TTL = process.env.ACCESS_TTL || "30m";
const REFRESH_TTL = process.env.REFRESH_TTL || "30d";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, kind: "access" },
    secret(),
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), kind: "refresh" },
    secret(),
    { expiresIn: REFRESH_TTL }
  );
}

export function verifyToken(token) {
  // Throws if invalid/expired; caller handles.
  return jwt.verify(token, secret());
}
