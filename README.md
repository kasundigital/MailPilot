<p align="center"><img src="assets/mailpilot-logo.svg" width="430" alt="MailPilot logo"></p>

<h1 align="center">MailPilot</h1>
<p align="center"><b>Self-hosted email campaigns with deliberate, consent-first delivery.</b></p>

MailPilot is a Docker-first bulk email application for VPS hosting. It supports contact paste imports, SMTP accounts, HTML campaign editing, per-account pacing, delivery logs, and unsubscribes.

> **Status: initial development release.** Run and test before exposing publicly. SMTP delivery is opt-in: campaigns must be started explicitly. This is not yet an audited production mailing platform.

## Features

- Single-admin login with server-side cookie JWT and configurable password
- Contacts with bulk paste import, email validation, normalization and de-duplication
- Contacts must have consent; suppression and unsubscribe are permanent by default
- SMTP credentials encrypted at rest (AES-256-GCM), test configuration without sending bulk email
- Campaign creation (subject, HTML, plaintext fallback) with preview and draft state
- Database-backed queue, paced sends, minute/hour/rolling-day limits and recipient logs
- Pause/resume campaigns; temporary SMTP failures retried with exponential backoff
- Per-recipient signed unsubscribe links, List-Unsubscribe headers and public unsubscribe endpoint
- Responsive dark admin dashboard, SVG branding, Docker Compose and MariaDB persistence

## One-command installation (Ubuntu / Debian)

On a fresh VPS, run:

```bash
curl -fsSL https://raw.githubusercontent.com/kasundigital/MailPilot/main/install.sh -o /tmp/mailpilot-install.sh
sudo bash /tmp/mailpilot-install.sh
```

The installer checks Docker and Compose, clones to `/opt/mailpilot`, generates unique secrets, starts containers, and checks localhost health. It asks for your admin email and public **HTTPS** URL. It saves the generated initial password in `/opt/mailpilot/initial-admin-credentials.txt` (root-only): move it into a secure password manager and delete that file. Re-running preserves existing `.env` and database volumes; it is not an automatic Git updater.

**Important:** MailPilot is bound to `127.0.0.1:3088`. Set up your own HTTPS Caddy/Nginx proxy from the hostname you entered to `http://127.0.0.1:3088` before visiting the site. Without HTTPS, login cookies will not work. Installer does **not** modify firewall rules, create DNS records, or issue certificates.

After installation:

```bash
cd /opt/mailpilot
sudo docker compose ps
sudo docker compose logs --tail=100
```

## Docker image and Docker Run

MailPilot includes a `Dockerfile` for local builds and a GitHub Actions workflow that publishes `ghcr.io/kasundigital/mailpilot:latest` after a successful build on `main` (the image is not guaranteed to exist until publishing succeeds).\n\n**Pre-built image with Compose:** configure secure `.env`, then run `docker compose -f compose.image.yml up -d`.\n\n**Local build with Compose:** `docker compose up -d --build`.\n\n**Docker Run:** needs a MariaDB container, a private network, persistent volume, and the MailPilot app container. See [full Docker Run and Docker Compose instructions](docs/DOCKER.md).\n\nBoth deployments listen on localhost by default; configure an HTTPS reverse proxy.\n\n## Manual installation

```bash
git clone https://github.com/kasundigital/MailPilot.git
cd MailPilot
cp .env.example .env
# Edit .env: set unique secure ADMIN_PASSWORD, JWT_SECRET, ENCRYPTION_KEY and database password.
docker compose up -d --build
```

Go to `http://YOUR_VPS_IP:3088` to log in. **Use HTTPS through Caddy/Nginx before public deployment**; bind the port to 127.0.0.1 behind your reverse proxy.

Use `openssl rand -hex 32` for `JWT_SECRET` and `ENCRYPTION_KEY`. Enter a real SMTP provider quota; illustrative limits are NOT blacklist protection. No email is dispatched until you create and start a campaign. Only import addresses with permission to receive your mail.

## SMTP & compliance

MailPilot is for permission-based email only. DNS authentication (SPF, DKIM, DMARC), verified sender identity, bounce/complaint handling, valid list-unsubscribe, and your SMTP provider's published limits remain your responsibility. SMTP acceptance is **not** proof of inbox delivery. Prefer provider webhooks for definitive bounce/delivery analytics.

Avoid exposing this app directly before reviewing security. Basic self-hosted functionality is included, but advanced features such as bounce webhooks, provider-specific quota discovery, OAuth2, password reset, SSO, multi-user roles, schedule/calendar campaigns, automated backups and advanced template editing remain on the roadmap.

## Architecture

- Node.js / Fastify backend with MariaDB and Nodemailer
- Persistent messages database with a conservative single worker
- Static responsive frontend (no build tool required)
- Docker Compose; no open relay

## Testing

```bash
npm install
npm test
```

## License

MIT. See LICENSE.
