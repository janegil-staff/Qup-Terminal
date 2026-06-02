// src/middleware/admin.js
import { User } from "../models/User.js";

// Must run after requireAuth. Loads the user and checks the admin role.
export async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("role banned");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "admin only" });
    }
    next();
  } catch {
    return res.status(500).json({ error: "auth check failed" });
  }
}
