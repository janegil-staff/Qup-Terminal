# Qup Terminal — backend (step 1)

Bare PTY-over-WebSocket pipe. Spawns a real shell per WebSocket connection and
streams it to a browser xterm.js test page. **No auth, no sandbox yet** — run on
localhost only.

## Run

```bash
npm install
npm start
# open http://127.0.0.1:3000  → you should get a live shell
```

Dev mode (auto-restart on file change):

```bash
npm run dev
```

## Config (env vars)

| var         | default      | meaning                              |
|-------------|--------------|--------------------------------------|
| `PORT`      | `3000`       | HTTP + WS port                       |
| `HOST`      | `127.0.0.1`  | bind address (keep localhost!)       |
| `SHELL_BIN` | `bash`       | shell to spawn (`zsh`, `powershell`) |

## Note on `node-pty`

`node-pty` is a **native module** — it compiles on install and needs build
tools present:

- **macOS:** Xcode Command Line Tools (`xcode-select --install`). On your M2,
  it builds for arm64 automatically.
- **Linux:** `python3`, `make`, `g++` (`build-essential`).
- **Windows:** windows-build-tools / VS build tools.

If `npm install` fails on node-pty, that's the cause — install the build tools
and re-run.

## What's next (from the spec)

2. Expo xterm WebView client (replace this test page)
3. Accessory key bar + resize handling
4. JWT auth on the socket upgrade
5. Sessions + MongoDB
6. Docker-per-session sandbox  ← required before any non-localhost use
