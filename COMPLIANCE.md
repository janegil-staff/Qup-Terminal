# Compliance & store-readiness checklist

This is what each "approver" needs. None of it is automatic — it's posture +
documents + operational habit. Treat this as a living checklist.

## Backend / hosting (DigitalOcean etc.) — won't get suspended

- [x] Rate limiting (per-IP) on auth + API
- [x] Concurrent-session cap per user
- [x] Sandbox network locked down (default `none`; `internal`/`proxy` options)
- [x] Admin kill switch + ban (POST /admin/users/:id/ban, /admin/sessions/:id/kill)
- [x] Orphaned-session sweep on restart
- [x] SSH host-key pinning (MITM guard)
- [ ] **You must do:** firewall (only 80/443 + your SSH), TLS via Caddy,
      fresh secrets generated on the server, monitoring/alerts on container
      counts + bandwidth, respond to any abuse notice within hours.

## App Store (Apple)

- [ ] Privacy policy URL (PRIVACY.md → host it)
- [ ] Terms of service URL (TERMS.md → host it)
- [x] Account deletion in-app (DELETE /auth/me) — REQUIRED by Apple
- [ ] Age rating set (likely 17+ given unrestricted content via SSH/terminal)
- [ ] App privacy "nutrition label" in App Store Connect (declare: email,
      usage data; SSH creds stored encrypted)
- [ ] Demo account for review (Apple needs to log in and test)
- [ ] Clear description that it's a terminal/SSH client (don't hide it)

## Google Play

- [ ] Privacy policy URL (same doc)
- [ ] Data safety form (declare email, encrypted credential storage)
- [x] Account deletion (DELETE /auth/me) + a web deletion path documented
- [ ] Target API level current
- [ ] Content rating questionnaire

## Honest note

A terminal/SSH app with open public registration is reviewable but scrutinized.
Apple/Google allow the category (Termius, Blink, Prompt exist) but expect a
polished, complete app + the legal docs above. Email verification is ON by
default here to reduce bot signups — keep it on for public launch.
