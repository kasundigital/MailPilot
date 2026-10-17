# MailPilot prebuilt image deployment

MailPilot remains an **initial development release**, not an independently security-audited mailing platform. Use HTTPS and review the security guidance in the main README.

## Install or update in one command

Review install.sh before running it. Ubuntu and Debian are supported.

~~~bash
curl -fsSL https://raw.githubusercontent.com/kasundigital/MailPilot/main/install.sh | sudo bash -s -- install
~~~

On subsequent deployments:

~~~bash
curl -fsSL https://raw.githubusercontent.com/kasundigital/MailPilot/main/install.sh | sudo bash -s -- update
~~~

For status/logs: run sudo bash /opt/mailpilot/install.sh status or sudo bash /opt/mailpilot/install.sh logs.

The script installs dependencies if necessary, clones or fast-forwards the source checkout, pulls **ghcr.io/kasundigital/mailpilot:latest** instead of building Node.js locally, and verifies that the published image matches the repository package version. It refuses to update if the GHCR publish job has not finished.

First-time install creates a protected .env file, unique authentication and encryption secrets, and /opt/mailpilot/initial-admin-credentials.txt (root-only). Transfer credentials to a password manager, then delete the file. Update never rotates JWT_SECRET or ENCRYPTION_KEY.

### Database protection

Both installation modes share the persistent database. Historically the local-build Compose volume was **mailpilot_db-data**; an earlier prebuilt-image Compose file used **mailpilot_mailpilot-db**. The installer detects both names, uses the existing one, and refuses to guess when both exist. You may explicitly set MAILPILOT_DB_VOLUME in .env after verifying the correct volume.

An update refuses to create a new blank database when the existing volume cannot be found. No command runs docker compose down -v or removes any volumes. **Always back up the database before upgrading.**

### Published images

GitHub Actions builds linux/amd64 and linux/arm64 from Dockerfile. Pull request builds test image creation but do not publish it. Successful main builds publish:

- ghcr.io/kasundigital/mailpilot:latest
- ghcr.io/kasundigital/mailpilot:0.2.3 (package-version tag)
- ghcr.io/kasundigital/mailpilot:sha-COMMIT
- vX.Y.Z tags when a corresponding Git tag is pushed

To pin a verified version, add MAILPILOT_IMAGE_TAG=0.2.3 to .env. Changing the tag is an explicit upgrade decision.

### Manual Compose

~~~bash
git clone https://github.com/kasundigital/MailPilot.git
cd MailPilot
cp .env.example .env
# Fill all administrator settings, SMTP secrets, database passwords, HTTPS PUBLIC_URL.
docker compose -f compose.image.yml pull
docker compose -f compose.image.yml up -d
~~~

The image Compose file supports MAILPILOT_DB_VOLUME. If migrating existing data, confirm the correct Docker volume before manually starting the app. The alternative docker-compose.yml builds from local source and is still supported for development.

### Docker Run

The app needs MariaDB and a private Docker network, not just one application container:

~~~bash
docker network create mailpilot-net
docker volume create mailpilot-db
docker run -d --name mailpilot-db --network mailpilot-net --restart unless-stopped \
  -e MARIADB_DATABASE=mailpilot -e MARIADB_USER=mailpilot \
  -e MARIADB_PASSWORD='SET_A_UNIQUE_DB_PASSWORD' \
  -e MARIADB_ROOT_PASSWORD='SET_ANOTHER_ROOT_PASSWORD' \
  -v mailpilot-db:/var/lib/mysql mariadb:11
# Create secure .env with DB_HOST=mailpilot-db and matching DB_USER/DB_PASSWORD.
docker run -d --name mailpilot-app --network mailpilot-net --restart unless-stopped \
  --env-file .env -p 127.0.0.1:3088:3088 \
  ghcr.io/kasundigital/mailpilot:latest
~~~

Wait for MariaDB readiness before starting the application. Health: curl -fsS http://127.0.0.1:3088/health. Configure HTTPS reverse proxy independently; TLS is required for secure admin cookies.

Do not put real database passwords into your shell history or source control.

## Upgrade Rollback & Restore

If an update fails or introduces breaking changes, you can roll back your MailPilot instance using the integrated JSON backups:
1. Ensure you have created a backup via the MailPilot UI **before** running the update script.
2. If you need to roll back, revert to the previous Docker image tag in your `.env` (e.g., `MAILPILOT_IMAGE_TAG=0.2.3`).
3. Start the application with the older image.
4. Go to the "Account Settings & Backups" tab in the UI.
5. Select your pre-upgrade backup file from the dropdown.
6. (Optional) Perform a **Dry run** to verify the data to be restored.
7. Uncheck the "Dry run" box and click "Restore Backup" to clear the newer schema/data and re-insert the JSON rows from the backup file.

*Note: The restore functionality truncates the tables and inserts the data from the encrypted backup file. Ensure you use the exact same `ENCRYPTION_KEY` that was used to create the backup.*
