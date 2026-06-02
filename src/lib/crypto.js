// src/lib/crypto.js
// AES-256-GCM encryption for secrets at rest (SSH keys/passwords).
// Key comes from APP_ENCRYPTION_KEY (32 bytes, base64 or hex). Generate one:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

import crypto from "node:crypto";

function key() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set");
  // Accept base64 or hex; must decode to 32 bytes.
  let buf;
  try {
    buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) buf = Buffer.from(raw, "hex");
  } catch {
    buf = Buffer.from(raw, "hex");
  }
  if (buf.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return buf;
}

export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

export function decrypt(enc) {
  if (!enc || !enc.iv || !enc.tag || !enc.data) {
    throw new Error("malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(enc.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  const out = Buffer.concat([
    decipher.update(Buffer.from(enc.data, "base64")),
    decipher.final(),
  ]);
  return out.toString("utf8");
}
