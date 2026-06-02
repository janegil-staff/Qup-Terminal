# Deploying to DigitalOcera (or any Linux host)

This is the production deploy: backend + MongoDB + Caddy (automatic HTTPS/WSS)
on one droplet, with the sandbox running via the host's Docker.

> **Read first — public-registration risk.** You chose open registration with
> network-enabled sandboxes. That is the highest-abuse configuration. Even with
> the rate limiting and 5-session cap added here, expect abuse attempts. Watch
> `docker ps`, your bandwidth, and DigitalOcean's abuse notices closely for the
> first weeks. If you see mining/attacks, set `SANDBOX_NETWORK=none` and/or
> `REGISTRATION_OPEN=false` immediately. You can flip both via env without code
> changes.

## What's included now

- Rate limiting (per-IP) on auth + API
- Concurrent-session cap per user (`MAX_SESSIONS_PER_USER`, default 5)
- SSH host-key pinning (rejects MITM on reconnect)
- Registration toggle (`REGISTRATION_OPEN`)
- Orphaned-session sweep on startup

## Prereqs

- A droplet (≥ 2GB RAM recommended — each session is a container; a 1GB box
  will OOM fast with multiple users).
- A domain pointed at the droplet's IP (an A record). Needed for TLS — login
  passwords and SSH creds must not travel over plain ws://.

## 1. Server setup

```bash
# on the droplet, as root
apt update && apt install -y docker.io docker-compose-plugin git
systemctl enable --now docker
```

## 2. Get the code + secrets

```bash
git clone <your-repo> /opt/qup-terminal-api
cd /opt/qup-terminal-api
cp .env.example .env
# GENERATE FRESH SECRETS ON THE SERVER — do not reuse any from chat/dev:
echo "JWT_SECRET=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')" >> .env
echo "APP_ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')" >> .env
# then edit .env: set MONGODB_URI=mongodb://mongo:27017/qup_terminal, SANDBOX_NETWORK, etc.
```

## 3. Build the sandbox image

```bash
docker build -t qup-terminal-sandbox:latest ./sandbox
```

## 4. docker-compose.yml (create this file)

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes: [ "mongo-data:/data/db" ]

  api:
    build: .            # needs a Dockerfile for the API (below)
    restart: unless-stopped
    env_file: .env
    environment:
      - HOST=0.0.0.0
      - MONGODB_URI=mongodb://mongo:27017/qup_terminal
    depends_on: [ mongo ]
    # The API spawns sandbox containers via the host Docker socket:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    ports: [ "127.0.0.1:3000:3000" ]

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: [ "80:80", "443:443" ]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on: [ api ]

volumes:
  mongo-data:
  caddy-data:
```

## 5. Caddyfile (auto-TLS — just works)

```
yourdomain.com {
    reverse_proxy api:3000
}
```

Caddy fetches a Let's Encrypt cert automatically. WSS works through the same
reverse_proxy line (Caddy handles the upgrade).

## 6. API Dockerfile (create as ./Dockerfile)

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y docker.io python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "src/server.js"]
```

(The API container needs the `docker` CLI to spawn sandbox containers on the
host via the mounted socket.)

## 7. Launch

```bash
docker compose up -d --build
docker compose logs -f api      # watch for "Auth: ON  Sandbox: ON"
```

## 8. Point the app at it

In the Expo app, set `EXPO_PUBLIC_API_BASE=https://yourdomain.com`. The ws URL
becomes wss:// automatically.

## Security note on the Docker socket

Mounting `/var/run/docker.sock` into the API container is effectively root on
the host. It's how the API spawns sandboxes, but it means the API process is
high-value — keep it patched, keep the box locked down (firewall: only 80/443
open; SSH key-only). For a hardened setup later, look into a rootless Docker or
a dedicated sandbox-runner service instead of the raw socket.

## Still recommended before heavy public use

- Email verification (skipped for now → bots can register freely)
- Egress limits on sandbox network (mining/attack guard)
- Monitoring + alerting on container counts and bandwidth
