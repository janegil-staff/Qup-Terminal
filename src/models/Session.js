// src/models/Session.js
// Metadata for a terminal session. We deliberately do NOT store the transcript
// (keystrokes/output) — that would capture passwords and tokens. Only metadata.

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: { type: String, enum: ["sandbox", "ssh"], default: "sandbox" },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host" }, // for ssh
    label: String,
    status: {
      type: String,
      enum: ["active", "ended", "error"],
      default: "active",
    },
    containerId: String, // for sandbox sessions
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    exitCode: Number,
    cols: Number,
    rows: Number,
    bytesIn: { type: Number, default: 0 },
    bytesOut: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Session = mongoose.model("Session", sessionSchema);
