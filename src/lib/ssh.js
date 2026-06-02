// src/lib/ssh.js
// Opens an SSH connection to a user's own server via ssh2 and starts an
// interactive shell. Exposes a small PTY-like wrapper (write/resize/kill/onData/
// onExit) so server.js can treat it the same way it treats a sandbox PTY.
//
// SSH runs HERE on the backend — never on the phone. The phone only speaks
// WebSocket; this module bridges that to a real SSH shell.

import { Client } from "ssh2";
import crypto from "node:crypto";

function keyFingerprint(keyBuffer) {
  // SHA-256 fingerprint, base64 (the "SHA256:…" form ssh shows).
  return (
    "SHA256:" +
    crypto.createHash("sha256").update(keyBuffer).digest("base64").replace(/=+$/, "")
  );
}

// Connect + open a shell. Returns a promise resolving to a session wrapper.
// opts: { host, port, username, authType, secret, cols, rows,
//         knownHostKey, onHostKey }
//   knownHostKey  – previously-pinned SHA256 fingerprint, or null on first use
//   onHostKey(fp) – called with the server's fingerprint so the caller can pin
//                   it on first use. If knownHostKey is set and differs, the
//                   connection is REJECTED (possible MITM).
export function openSshSession(opts) {
  const {
    host,
    port = 22,
    username,
    authType,
    secret,
    cols = 80,
    rows = 24,
    knownHostKey = null,
    onHostKey = null,
  } = opts;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;

    const connectConfig = {
      host,
      port,
      username,
      readyTimeout: 15000,
      keepaliveInterval: 20000,
      // Host-key pinning: verify the server key against the pinned fingerprint.
      hostVerifier: (keyBuf) => {
        const fp = keyFingerprint(keyBuf);
        if (knownHostKey) {
          // Reject on mismatch — this is the MITM guard.
          if (fp !== knownHostKey) {
            return false;
          }
          return true;
        }
        // First use: accept and report the fingerprint so the caller can pin it.
        if (onHostKey) {
          try {
            onHostKey(fp);
          } catch {
            /* ignore */
          }
        }
        return true;
      },
    };
    if (authType === "key") connectConfig.privateKey = secret;
    else connectConfig.password = secret;

    conn.on("ready", () => {
      conn.shell({ term: "xterm-color", cols, rows }, (err, stream) => {
        if (err) {
          if (!settled) {
            settled = true;
            conn.end();
            reject(err);
          }
          return;
        }

        const dataCbs = [];
        const exitCbs = [];

        stream.on("data", (d) => {
          const s = d.toString("utf8");
          dataCbs.forEach((cb) => cb(s));
        });
        stream.stderr.on("data", (d) => {
          const s = d.toString("utf8");
          dataCbs.forEach((cb) => cb(s));
        });
        stream.on("close", () => {
          exitCbs.forEach((cb) => cb({ exitCode: 0 }));
          conn.end();
        });

        const wrapper = {
          write: (data) => {
            try {
              stream.write(data);
            } catch {
              /* stream closed */
            }
          },
          resize: (c, r) => {
            try {
              stream.setWindow(r, c, 0, 0);
            } catch {
              /* ignore */
            }
          },
          kill: () => {
            try {
              stream.end();
            } catch {
              /* ignore */
            }
            try {
              conn.end();
            } catch {
              /* ignore */
            }
          },
          onData: (cb) => dataCbs.push(cb),
          onExit: (cb) => exitCbs.push(cb),
        };

        if (!settled) {
          settled = true;
          resolve(wrapper);
        }
      });
    });

    conn.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    // Kick off the connection.
    try {
      conn.connect(connectConfig);
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err);
      }
    }
  });
}

// Run a single command over a fresh SSH connection and return its output.
// Used by the Pi panel (status reads, quick actions) — request/response, not
// an interactive shell. Reuses host-key pinning. Resolves
// { stdout, stderr, code }.
export function runSshCommand(opts) {
  const {
    host,
    port = 22,
    username,
    authType,
    secret,
    command,
    knownHostKey = null,
    onHostKey = null,
    timeoutMs = 15000,
  } = opts;

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      try {
        conn.end();
      } catch {
        /* ignore */
      }
      fn(arg);
    };

    const timer = setTimeout(
      () => done(reject, new Error("SSH command timed out")),
      timeoutMs
    );

    const connectConfig = {
      host,
      port,
      username,
      readyTimeout: 15000,
      hostVerifier: (keyBuf) => {
        const fp = keyFingerprint(keyBuf);
        if (knownHostKey) return fp === knownHostKey;
        if (onHostKey) {
          try {
            onHostKey(fp);
          } catch {
            /* ignore */
          }
        }
        return true;
      },
    };
    if (authType === "key") connectConfig.privateKey = secret;
    else connectConfig.password = secret;

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return done(reject, err);
        }
        let stdout = "";
        let stderr = "";
        stream.on("data", (d) => (stdout += d.toString("utf8")));
        stream.stderr.on("data", (d) => (stderr += d.toString("utf8")));
        stream.on("close", (code) => {
          clearTimeout(timer);
          done(resolve, { stdout, stderr, code });
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      done(reject, err);
    });

    try {
      conn.connect(connectConfig);
    } catch (err) {
      clearTimeout(timer);
      done(reject, err);
    }
  });
}
