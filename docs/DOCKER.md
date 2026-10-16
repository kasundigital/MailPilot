# MailPilot Docker deployment

**Important:** The image is automatically published to `ghcr.io/kasundigital/mailpilot:latest` when the Docker Image workflow succeeds on main. PR builds do not publish images. Before that first successful workflow, the image does not exist. Verify the package in GitHub Packages.

## Option 1 — Docker Compose using prebuilt image

```bash
git clone https://github.com/kasundigital/MailPilot.git
cd MailPilot
cp .env.example .env
# Set secure unique values for ADMIN_PASSWORD, JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD,
# MARIADB_ROOT_PASSWORD, ADMIN_EMAIL and HTTPS PUBLIC_URL before starting!
docker compose -f compose.image.yml pull
docker compose -f compose.image.yml up -d
docker compose -f compose.image.yml ps
```

To generate `JWT_SECRET` and `ENCRYPTION_KEY`, run `openssl rand -hex 32` separately for each. Keep `.env` secret.

To use locally built images instead, use `docker compose up -d --build` with `docker-compose.yml`.

## Option 2 — Docker run

MailPilot requires a MariaDB database; **a single app-only docker run is not sufficient**. Example with a persistent database volume and private Docker network:

```bash
docker network create mailpilot-net
docker volume create mailpilot-db
docker run -d --name mailpilot-db --network mailpilot-net --restart unless-stopped \
  -e MARIADB_DATABASE=mailpilot \
  -e MARIADB_USER=mailpilot \
  -e MARIADB_PASSWORD='SET_A_LONG_UNIQUE_DB_PASSWORD' \
  -e MARIADB_ROOT_PASSWORD='SET_A_DIFFERENT_ROOT_PASSWORD' \
  -v mailpilot-db:/var/lib/mysql mariadb:11

# Create a secure .env from .env.example.
# Set DB_HOST=mailpilot-db, DB_USER=mailpilot, DB_NAME=mailpilot,
# DB_PASSWORD to the exact MariaDB password above, PUBLIC_URL=https://your.domain,
# ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET, ENCRYPTION_KEY.
# Do not put actual passwords in your shell history; use a root-owned .env.
docker run -d --name mailpilot-app --network mailpilot-net --restart unless-stopped \
  --env-file .env -p 127.0.0.1:3088:3088 \
  ghcr.io/kasundigital/mailpilot:latest

docker logs --tail 100 mailpilot-app
curl -fsS http://127.0.0.1:3088/health
```

For a first start, allow MariaDB to initialize before starting the app. The above plain `docker run` does not have Compose's database readiness dependency. Restart `mailpilot-app` if needed after MariaDB is healthy.

## Production recommendations

- Use TLS HTTPS proxy to `127.0.0.1:3088`. Authentication cookies are secure-only.
- Restrict access to your admin interface, use strong secrets and provider-approved SMTP credentials.
- Keep `JWT_SECRET` and `ENCRYPTION_KEY` stable after first deployment or existing sessions/SMTP account credentials break.
- Backup the MariaDB volume before upgrading.
- Docker image tags are available only after the publishing workflow succeeds. Prefer pinned version tags once a release exists.
- SMTP delivery begins only after you explicitly start a campaign. Only send permission-based emails.
