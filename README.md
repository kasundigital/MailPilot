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

## Quick start

```bash
git clone https://github.com/kasundigital/MailPilot.git
cd MailPilot
cp .env.example .env
# Edit .env: set unique secure ADMIN_PASSWORD, JWT_SECRET, ENCRYPTION_KEY and database password.
docker compose up -d --build
```

Go to `http://YOUR_VPS_IP:3088` to log in. **Use HTTPS through Caddy/Nginx before public deployment**; bind the port to 127.0.0.1 behind your reverse proxy.

### HTTPS Production Deployment (Caddy Example)
For production, you must use HTTPS to secure login credentials, CSRF tokens, and session cookies. Install Caddy and configure your `Caddyfile`:

```
yourdomain.com {
    reverse_proxy 127.0.0.1:3088
}
```
Update `PUBLIC_URL` in your `.env` to match `https://yourdomain.com`.

### Provider-Specific Quota Guidance
When configuring SMTP limits, adhere to your provider's actual quotas to avoid temporary bans. Example guidelines (verify with your provider):
- **Amazon SES**: Starts at 14 emails/second (~840/min).
- **SendGrid**: Recommended pacing based on plan, often thousands per minute.
- **Mailgun**: Scalable, but rate-limiting errors (429) can occur on standard plans if pushed too fast.
Set conservative limits initially (e.g., 50/minute) and scale up as your IP warms up.

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
