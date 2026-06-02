// src/models/Host.js
// A saved SSH target belonging to a user. The private key / password is
// encrypted at rest with a key derived from APP_ENCRYPTION_KEY (see lib/crypto).
// We never store secrets in plaintext.

import mongoose from "mongoose";

const hostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    host: { type: String, required: true },
    port: { type: Number, default: 22 },
    username: { type: String, required: true },
    authType: { type: String, enum: ["password", "key"], default: "password" },
    // Marks this host as a Raspberry Pi (enables the Pi status/control panel).
    isPi: { type: Boolean, default: false },
    // Pinned SSH host-key fingerprint (SHA256:…). Captured on first connect;
    // a mismatch on later connects rejects the session (MITM guard).
    knownHostKey: { type: String, default: null },
    // Encrypted blobs (never plaintext). Shape: { iv, tag, data } base64.
    secretEnc: {
      iv: String,
      tag: String,
      data: String,
    },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

export const Host = mongoose.model("Host", hostSchema);
