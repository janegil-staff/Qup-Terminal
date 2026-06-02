// src/lib/sandbox.js
// Builds the locked-down `docker run` invocation for a session and spawns it as
// a PTY. The security posture (even with network enabled): unprivileged,
// non-root, capped CPU/memory/PIDs, read-only root FS with a small writable
// home+tmp, no privilege escalation, and --rm so the container is destroyed on
// exit. A compromised session is bounded to its own throwaway container.

import pty from "node-pty";
import crypto from "node:crypto";

const IMAGE = process.env.SANDBOX_IMAGE || "qup-terminal-sandbox:latest";
const MEMORY = process.env.SANDBOX_MEMORY || "512m";
const CPUS = process.env.SANDBOX_CPUS || "1";
const PIDS = process.env.SANDBOX_PIDS || "256";
const TMPFS_SIZE = process.env.SANDBOX_TMPFS || "64m";
const HOME_SIZE = process.env.SANDBOX_HOME_SIZE || "256m";

// Network mode — defaults to "none" (safest). Options:
//   none     – no network at all (no apt/pip/npm). Safest.
//   internal – attach to a Docker network created WITHOUT internet egress
//              (SANDBOX_NET_NAME). Containers talk to nothing outside.
//   proxy    – no direct net; HTTP(S)_PROXY points at an allowlist proxy
//              (SANDBOX_PROXY_URL) so only whitelisted mirrors are reachable.
//   bridge   – full internet (UNSAFE for public use; explicit opt-in).
const NETWORK_MODE = process.env.SANDBOX_NETWORK || "none";
const NET_NAME = process.env.SANDBOX_NET_NAME || "qupterm-internal";
const PROXY_URL = process.env.SANDBOX_PROXY_URL || "";

// Hard wall-clock cap per session (ms). 0 disables.
export const SESSION_TIMEOUT_MS = Number(
  process.env.SANDBOX_TIMEOUT_MS || 60 * 60 * 1000 // 1 hour
);

export function makeContainerName() {
  return `qupterm_${crypto.randomBytes(6).toString("hex")}`;
}

// Map the network mode to docker flags + extra env.
function networkArgs() {
  switch (NETWORK_MODE) {
    case "bridge":
      // Full internet. UNSAFE for public use — explicit opt-in only.
      return { args: ["--network", "bridge"], env: [] };
    case "internal":
      // A Docker network created with --internal (no egress). Operator must
      // create it: docker network create --internal qupterm-internal
      return { args: ["--network", NET_NAME], env: [] };
    case "proxy": {
      // No direct network; everything must go through the allowlist proxy.
      // The proxy itself lives on an internal docker network the container can
      // reach, so we attach to that network and inject proxy env vars.
      const env = [];
      if (PROXY_URL) {
        env.push(
          "--env", `HTTP_PROXY=${PROXY_URL}`,
          "--env", `HTTPS_PROXY=${PROXY_URL}`,
          "--env", `http_proxy=${PROXY_URL}`,
          "--env", `https_proxy=${PROXY_URL}`
        );
      }
      return { args: ["--network", NET_NAME], env };
    }
    case "none":
    default:
      return { args: ["--network", "none"], env: [] };
  }
}

// Build the docker run argument list. Kept as an array (no shell parsing).
export function buildDockerArgs({ name, cols, rows }) {
  const net = networkArgs();
  const args = [
    "run",
    "-i",
    "--rm",
    "--name",
    name,
    // Interactive TTY sized to the client.
    "--tty",
    // Network (mode-dependent — defaults to none):
    ...net.args,
    // Isolation / hardening:
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--read-only", // root FS read-only…
    // …but give writable, size-limited tmpfs for the places that need it:
    "--tmpfs",
    `/tmp:rw,size=${TMPFS_SIZE},mode=1777`,
    "--tmpfs",
    `/home/sandbox:rw,size=${HOME_SIZE},mode=0755,uid=1000,gid=1000`,
    // Resource caps:
    "--memory",
    MEMORY,
    "--memory-swap",
    MEMORY, // disallow swap beyond memory
    "--cpus",
    CPUS,
    "--pids-limit",
    PIDS,
    // Proxy env (proxy mode only):
    ...net.env,
    // Initial terminal size via env (xterm honours these on start).
    "--env",
    `COLUMNS=${cols || 80}`,
    "--env",
    `LINES=${rows || 24}`,
    IMAGE,
    "/bin/bash",
  ];
  return args;
}

// Spawn a sandbox PTY. Returns { shell, name }. Throws if docker isn't usable.
export function spawnSandbox({ cols = 80, rows = 24 } = {}) {
  const name = makeContainerName();
  const args = buildDockerArgs({ name, cols, rows });
  const shell = pty.spawn("docker", args, {
    name: "xterm-color",
    cols,
    rows,
    cwd: process.env.HOME || process.cwd(),
    env: process.env,
  });
  return { shell, name };
}

// Best-effort hard kill of a container by name (used on timeout/cleanup).
export function killContainer(name) {
  if (!name) return;
  try {
    const k = pty.spawn("docker", ["kill", name], { cols: 80, rows: 24 });
    // Let it run and exit on its own; we don't need the output.
    setTimeout(() => {
      try {
        k.kill();
      } catch {
        /* ignore */
      }
    }, 5000);
  } catch {
    /* docker gone or already removed */
  }
}
