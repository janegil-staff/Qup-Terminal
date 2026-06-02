// src/lib/pi.js
// Raspberry Pi-specific command definitions and output parsers. These run via
// runSshCommand against the user's Pi. Parsers are written against the known
// output formats of these commands on Raspberry Pi OS (Debian-based).
//
// NOTE: untested against live hardware yet — parser logic is validated against
// captured sample output. Verify on a real Pi before relying on it.

// One combined status command — cheaper than many round-trips. Each section is
// delimited so we can split the single stdout reliably.
export const STATUS_COMMAND = [
  'echo "===TEMP==="; (vcgencmd measure_temp 2>/dev/null || echo "temp=N/A")',
  'echo "===THROTTLE==="; (vcgencmd get_throttled 2>/dev/null || echo "throttled=N/A")',
  'echo "===UPTIME==="; uptime -p 2>/dev/null || uptime',
  'echo "===LOADAVG==="; cat /proc/loadavg',
  'echo "===MEM==="; free -m',
  'echo "===DISK==="; df -h /',
  'echo "===MODEL==="; (cat /proc/device-tree/model 2>/dev/null | tr -d "\\0") || echo "unknown"',
  'echo "===HOSTNAME==="; hostname',
].join("; ");

function section(text, name) {
  const re = new RegExp(`===${name}===\\n([\\s\\S]*?)(?:\\n===|$)`);
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

export function parseStatus(stdout) {
  const out = {};

  // Temp: "temp=47.2'C"
  const temp = section(stdout, "TEMP");
  const tm = temp.match(/temp=([\d.]+)/);
  out.tempC = tm ? Number(tm[1]) : null;

  // Throttle: "throttled=0x0"  (non-zero = throttling has occurred)
  const thr = section(stdout, "THROTTLE");
  const thm = thr.match(/throttled=(0x[0-9a-fA-F]+)/);
  out.throttledRaw = thm ? thm[1] : null;
  out.throttled = thm ? parseInt(thm[1], 16) !== 0 : null;

  // Uptime: "up 3 hours, 12 minutes"
  out.uptime = section(stdout, "UPTIME") || null;

  // Load average: "0.08 0.03 0.01 1/123 4567"
  const la = section(stdout, "LOADAVG").split(/\s+/);
  out.load = la.length >= 3 ? { one: +la[0], five: +la[1], fifteen: +la[2] } : null;

  // Memory (free -m): parse the "Mem:" line → total/used in MB
  const memLine = section(stdout, "MEM")
    .split("\n")
    .find((l) => /^Mem:/.test(l));
  if (memLine) {
    const p = memLine.split(/\s+/);
    out.memory = { totalMb: +p[1], usedMb: +p[2], freeMb: +p[3] };
    out.memory.usedPct = out.memory.totalMb
      ? Math.round((out.memory.usedMb / out.memory.totalMb) * 100)
      : null;
  } else out.memory = null;

  // Disk (df -h /): second line → size/used/avail/use%
  const diskLines = section(stdout, "DISK").split("\n");
  if (diskLines.length >= 2) {
    const p = diskLines[1].split(/\s+/);
    out.disk = { size: p[1], used: p[2], avail: p[3], usePct: p[4] };
  } else out.disk = null;

  out.model = section(stdout, "MODEL") || null;
  out.hostname = section(stdout, "HOSTNAME") || null;

  return out;
}

// Quick actions. `requiresSudo` ones are wrapped with sudo; the user's account
// on the Pi must allow passwordless sudo for these to work non-interactively
// (typical on default Pi OS for the primary user).
export const ACTIONS = {
  reboot: { label: "Reboot", command: "sudo reboot", confirm: true, destructive: true },
  shutdown: { label: "Shutdown", command: "sudo shutdown -h now", confirm: true, destructive: true },
  update: {
    label: "Update packages",
    command: "sudo apt-get update && sudo apt-get -y upgrade",
    confirm: true,
    destructive: false,
  },
  restartSsh: {
    label: "Restart SSH",
    command: "sudo systemctl restart ssh",
    confirm: true,
    destructive: false,
  },
  services: {
    label: "Running services",
    command: "systemctl list-units --type=service --state=running --no-pager --no-legend | head -40",
    confirm: false,
    destructive: false,
  },
};
