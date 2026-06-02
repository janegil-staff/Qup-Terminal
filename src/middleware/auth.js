// src/middleware/auth.js
// Express middleware: require a valid Bearer access token. Attaches req.userId.

import { verifyToken } from "../lib/tokens.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing bearer token" });
  }
  try {
    const payload = verifyToken(token);
    if (payload.kind !== "access") {
      return res.status(401).json({ error: "wrong token kind" });
    }
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}
