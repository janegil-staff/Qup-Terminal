// src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    language: { type: String, default: "no" },
    // Email verification
    emailVerified: { type: Boolean, default: false },
    verifyToken: { type: String, default: null },
    verifyTokenExpires: { type: Date, default: null },
    // Moderation
    role: { type: String, enum: ["user", "admin"], default: "user" },
    banned: { type: Boolean, default: false },
    bannedReason: { type: String, default: null },
    settings: {
      fontSize: { type: Number, default: 14 },
      theme: { type: String, default: "dark" },
      keyboardBar: { type: Boolean, default: true },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
