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

## One-command install / update (Ubuntu / Debian)

MailPilot is distributed using a prebuilt GitHub Container Registry (GHCR) image.

~~~bash
# Fresh installation
curl -fsSL https://raw.githubusercontent.com/kasundigital/MailPilot/main/install.sh | sudo bash -s -- install

# Subsequent updates — preserves .env and MariaDB data
curl -fsSL https://raw.githubusercontent.com/kasundigital/MailPilot/main/install.sh | sudo bash -s -- update
~~~

The installer prompts for your administrator email and HTTPS public URL on first install, generates cryptographic secrets and root-only initial credentials, selects the existing database volume, pulls the published image, verifies the image version, and checks localhost health. It never silently creates a new database during updates. The GHCR workflow must complete before running update. **Back up MariaDB first.**

MailPilot binds to 127.0.0.1:3088. Configure a separate HTTPS Caddy/Nginx reverse proxy to that address. Review [Docker deployment and recovery details](docs/DOCKER.md).

## Docker image and Docker Run

MailPilot includes a `Dockerfile` and GitHub Actions that publishes `ghcr.io/kasundigital/mailpilot:latest` and versioned multi-architecture images after a successful build on `main`.

**Pre-built image with Compose:** configure secure `.env`, then run `docker compose -f compose.image.yml up -d`.

**Local build with Compose:** `docker compose up -d --build`.

**Docker Run:** needs a MariaDB container, a private network, persistent volume, and the MailPilot app container. See [full Docker Run and Docker Compose instructions](docs/DOCKER.md).

Both deployments listen on localhost by default; configure an HTTPS reverse proxy.

## Manual installation

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
- Persistent messages database with durable worker leases, graceful shutdown, and support for horizontal concurrency
- Static responsive frontend (no build tool required)
- Docker Compose; no open relay

## Testing

```bash
npm install
npm test
```

## License

MIT. See LICENSE.

## Contact management

The Contacts screen offers server-side email search, status/tag filters, sorting and 25-contact pages. You can select up to 100 contacts per API request (the UI selects only the visible page), export selected addresses to CSV, add tags or suppress contacts. Suppression sets subscribed=false and removes queued messages for those contacts; it cannot be reversed from this interface, and it never re-subscribes people. Consent is still required when importing. All mutations require administrator authentication, CSRF protection and write an audit entry. The new contact_tags table is created automatically during normal startup without altering historical contact records.


## Test SMTP before saving

On **SMTP Accounts**, complete the Connection fields and click **Test connection** before saving the sender. MailPilot attempts a TLS-protected SMTP connection and account login with the entered settings without storing a new SMTP account or sending an email. A message below the form confirms the result or provides safe diagnostics for authentication, network and TLS failures. Credentials are not returned in responses; tests require an authenticated admin session, CSRF validation and are rate-limited. Successfully verifying credentials is **not** proof of email deliverability. After saving, use **Test SMTP** in Configured SMTP accounts to verify the stored settings. For a real delivery check, use the explicitly triggered Compose Email test send.
