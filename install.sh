#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
MODE="${1:-install}"
DIR="${MAILPILOT_DIR:-/opt/mailpilot}"
PORT="${MAILPILOT_PORT:-3088}"
REPO="https://github.com/kasundigital/MailPilot.git"
IMAGE="ghcr.io/kasundigital/mailpilot"
log(){ printf '\n[MailPilot] %s\n' "$*"; }
fail(){ printf '[MailPilot] ERROR: %s\n' "$*" >&2; exit 1; }
ask(){ local answer; read -r -p "$1" answer </dev/tty || fail "Interactive terminal required"; printf '%s' "$answer"; }
[[ "$MODE" == install || "$MODE" == update || "$MODE" == status || "$MODE" == logs ]] || fail "Usage: install.sh [install|update|status|logs]"
[[ "$(id -u)" -eq 0 ]] || fail "Run with sudo."
if [[ "$MODE" == status || "$MODE" == logs ]]; then
  [[ -f "$DIR/.env" && -f "$DIR/compose.image.yml" ]] || fail "MailPilot image installation not found in $DIR"
  cd "$DIR"
  if [[ "$MODE" == status ]]; then docker compose -f compose.image.yml ps; else docker compose -f compose.image.yml logs --tail=120; fi
  exit 0
fi
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == ubuntu || "${ID:-}" == debian || "${ID_LIKE:-}" == *debian* ]] || fail "Ubuntu or Debian required"
[[ "$PORT" =~ ^[0-9]+$ ]] && ((PORT >= 1024 && PORT <= 65535)) || fail "Invalid MAILPILOT_PORT"
[[ "$MODE" != update || ( -f "$DIR/.env" && -d "$DIR/.git" ) ]] || fail "No existing installation at $DIR; run install"
log "Checking prerequisites"
if ! command -v git >/dev/null || ! command -v curl >/dev/null || ! command -v openssl >/dev/null || ! command -v python3 >/dev/null || ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates git curl openssl python3 >/dev/null
  if ! command -v docker >/dev/null; then apt-get install -y -qq docker.io >/dev/null || fail "Docker install failed"; fi
  if ! docker compose version >/dev/null 2>&1; then
    apt-get install -y -qq docker-compose-v2 >/dev/null 2>&1 || apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1 || fail "Docker Compose v2 required"
  fi
fi
systemctl enable --now docker >/dev/null
docker info >/dev/null || fail "Docker unavailable"
if [[ ! -f "$DIR/.env" ]]; then
  [[ "$MODE" == install ]] || fail "No .env found"
  if [[ -e "$DIR" ]]; then [[ -d "$DIR/.git" ]] || fail "Directory exists but is not a Git checkout: $DIR"
  else git clone --depth 1 --branch main "$REPO" "$DIR"; fi
  cd "$DIR"
  [[ -f .env.example ]] || fail "Missing .env.example"
  EMAIL="${MAILPILOT_ADMIN_EMAIL:-$(ask 'Admin email: ')}"
  URL="${MAILPILOT_PUBLIC_URL:-$(ask 'Public HTTPS URL: ')}"
  [[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || fail "Invalid admin email"
  [[ "$URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || fail "HTTPS URL with no slash or path required"
  cp .env.example .env
  ADMIN_PASSWORD="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -hex 32)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"
  DB_PASSWORD="$(openssl rand -hex 32)"
  ROOT_PASSWORD="$(openssl rand -hex 32)"
  export PORT EMAIL URL ADMIN_PASSWORD JWT_SECRET ENCRYPTION_KEY DB_PASSWORD ROOT_PASSWORD
  python3 - <<'PY'
import os
from pathlib import Path
p=Path('.env')
mapped={'APP_PORT':'PORT','PUBLIC_URL':'URL','ADMIN_EMAIL':'EMAIL','ADMIN_PASSWORD':'ADMIN_PASSWORD','JWT_SECRET':'JWT_SECRET','ENCRYPTION_KEY':'ENCRYPTION_KEY','DB_PASSWORD':'DB_PASSWORD','MARIADB_ROOT_PASSWORD':'ROOT_PASSWORD'}
out=[]
for line in p.read_text().splitlines():
    k=line.split('=',1)[0]
    out.append(k+'='+os.environ[mapped[k]] if k in mapped else line)
p.write_text('\n'.join(out)+'\n')
PY
  chmod 600 .env
  printf 'URL: %s\nAdmin email: %s\nAdmin password: %s\n' "$URL" "$EMAIL" "$ADMIN_PASSWORD" > initial-admin-credentials.txt
  chmod 600 initial-admin-credentials.txt
  log "Credentials: $DIR/initial-admin-credentials.txt (root-only). Move to a password manager then delete."
else
  [[ -d "$DIR/.git" ]] || fail "Refusing to modify existing non-Git installation"
  cd "$DIR"
  git diff --quiet && git diff --cached --quiet || fail "Local tracked changes detected. Review them before updating."
  log "Updating code without modifying .env or the database"
  git fetch --depth 1 origin main
  git merge --ff-only origin/main || fail "Fast-forward failed; no reset performed."
fi
cd "$DIR"
[[ -f compose.image.yml && -f package.json ]] || fail "Missing Compose image configuration"
# Select the existing database volume, including the older image Compose volume name.
PROJECT="${COMPOSE_PROJECT_NAME:-$(basename "$DIR" | tr '[:upper:]' '[:lower:]')}"
CURRENT_VOLUME="${PROJECT}_db-data"
LEGACY_IMAGE_VOLUME="${PROJECT}_mailpilot-db"
EXPLICIT_VOLUME="$(sed -n 's/^MAILPILOT_DB_VOLUME=//p' .env | tail -n 1)"
volume_exists(){ docker volume inspect "$1" >/dev/null 2>&1; }
if [[ -n "$EXPLICIT_VOLUME" ]]; then
  VOLUME="$EXPLICIT_VOLUME"
  if [[ "$MODE" == update ]] && ! volume_exists "$VOLUME"; then fail "Configured database volume $VOLUME does not exist"; fi
else
  has_current=0; has_legacy=0
  volume_exists "$CURRENT_VOLUME" && has_current=1
  volume_exists "$LEGACY_IMAGE_VOLUME" && has_legacy=1
  if ((has_current && has_legacy)); then fail "Both old database volumes exist. Investigate and set MAILPILOT_DB_VOLUME in .env before proceeding."; fi
  if ((has_current)); then VOLUME="$CURRENT_VOLUME"
  elif ((has_legacy)); then VOLUME="$LEGACY_IMAGE_VOLUME"
  elif [[ "$MODE" == update ]]; then fail "No previous DB volume found; refusing to start with a blank database"
  else VOLUME="$CURRENT_VOLUME"; fi
  printf '\nMAILPILOT_DB_VOLUME=%s\n' "$VOLUME" >> .env
  chmod 600 .env
fi
log "Preserving database volume $VOLUME and existing secrets"
docker compose -f compose.image.yml config -q || fail "Invalid image Compose settings"
TAG="$(sed -n 's/^MAILPILOT_IMAGE_TAG=//p' .env | tail -n 1)"
TAG="${TAG:-latest}"
REF="$IMAGE:$TAG"
log "Pulling published image $REF"
docker pull "$REF" || fail "Image unavailable in GHCR: wait for Docker Image GitHub Actions workflow."
if [[ "$TAG" == latest ]]; then
  EXPECTED="$(python3 -c 'import json;print(json.load(open("package.json"))["version"])')"
  ACTUAL="$(docker run --rm --entrypoint node "$REF" -p 'require("./package.json").version')" || fail "Cannot inspect Docker image version."
  [[ "$EXPECTED" == "$ACTUAL" ]] || fail "Published image is v$ACTUAL, but source is v$EXPECTED. Wait for GitHub Actions; deployment unchanged."
fi
docker compose -f compose.image.yml up -d || fail "Startup failed. Existing database volume preserved."
ACTUAL_PORT="$(sed -n 's/^APP_PORT=//p' .env | tail -n 1)"
[[ "$ACTUAL_PORT" =~ ^[0-9]+$ ]] || fail "Invalid APP_PORT in .env"
for _ in {1..40}; do
  if curl -fsS "http://127.0.0.1:$ACTUAL_PORT/health" >/dev/null 2>&1; then
    log "Healthy at http://127.0.0.1:$ACTUAL_PORT. Configure HTTPS reverse proxy separately."
    exit 0
  fi
  sleep 3
done
docker compose -f compose.image.yml ps
fail "Health check failed; inspect with: sudo bash $DIR/install.sh logs"
