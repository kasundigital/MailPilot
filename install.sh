#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
REPO=https://github.com/kasundigital/MailPilot.git
DIR="${MAILPILOT_DIR:-/opt/mailpilot}"
PORT="${MAILPILOT_PORT:-3088}"
log(){ printf '\n[MailPilot] %s\n' "$*"; }
fail(){ echo "[MailPilot] ERROR: $*" >&2; exit 1; }
ask(){ local value; read -r -p "$1" value </dev/tty || fail "Terminal required"; printf '%s' "$value"; }
[[ "$(id -u)" -eq 0 ]] || fail "Use sudo or root."
source /etc/os-release
[[ "${ID:-}" == ubuntu || "${ID:-}" == debian || "${ID_LIKE:-}" == *debian* ]] || fail "Ubuntu/Debian only."
[[ "$PORT" =~ ^[0-9]+$ ]] && ((PORT>=1024 && PORT<=65535)) || fail "Invalid port."
log "Installing dependencies"
apt-get update -qq
apt-get install -y -qq ca-certificates git openssl curl python3 >/dev/null
if ! command -v docker >/dev/null; then
  apt-get install -y docker.io >/dev/null || fail "Please install Docker manually."
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-v2 >/dev/null 2>&1 || apt-get install -y docker-compose-plugin >/dev/null 2>&1 || fail "Please install Docker Compose v2."
fi
systemctl enable --now docker >/dev/null
docker info >/dev/null || fail "Docker daemon unavailable"
if [[ -f "$DIR/.env" ]]; then
  log "Existing installation detected; keeping all settings and data."
  [[ -d "$DIR/.git" ]] || fail "Existing installation is not a Git repository."
else
  EMAIL="${MAILPILOT_ADMIN_EMAIL:-$(ask 'Admin email: ')}"
  URL="${MAILPILOT_PUBLIC_URL:-$(ask 'Public HTTPS URL (https://mail.example.com): ')}"
  [[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || fail "Invalid email."
  [[ "$URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] || fail "HTTPS URL required, no slash/path."
  if [[ -e "$DIR" ]]; then
    [[ -d "$DIR/.git" ]] || fail "Directory already exists: $DIR"
  else
    git clone --depth 1 --branch main "$REPO" "$DIR"
  fi
  cd "$DIR"
  [[ -f .env.example ]] || fail "Missing .env.example"
  cp .env.example .env
  ADMIN_PASSWORD="$(openssl rand -hex 32)"
  export PORT EMAIL URL ADMIN_PASSWORD
  export JWT_SECRET="$(openssl rand -hex 32)"
  export ENCRYPTION_KEY="$(openssl rand -hex 32)"
  export DB_PASSWORD="$(openssl rand -hex 32)"
  export ROOT_PASSWORD="$(openssl rand -hex 32)"
  python3 - <<'PY'
import os
from pathlib import Path
p=Path('.env')
vals={'APP_PORT':'PORT','PUBLIC_URL':'URL','ADMIN_EMAIL':'EMAIL','ADMIN_PASSWORD':'ADMIN_PASSWORD','JWT_SECRET':'JWT_SECRET','ENCRYPTION_KEY':'ENCRYPTION_KEY','DB_PASSWORD':'DB_PASSWORD','MARIADB_ROOT_PASSWORD':'ROOT_PASSWORD'}
p.write_text('\n'.join(k+'='+os.environ[vals[k]] if (k:=line.split('=',1)[0]) in vals else line for line in p.read_text().splitlines())+'\n')
PY
  chmod 600 .env
  printf 'URL: %s\nAdmin email: %s\nAdmin password: %s\n' "$URL" "$EMAIL" "$ADMIN_PASSWORD" > initial-admin-credentials.txt
  chmod 600 initial-admin-credentials.txt
  log "Credentials saved in $DIR/initial-admin-credentials.txt (root-only). Move them to a password manager, then delete this file."
fi
cd "$DIR"
[[ -f docker-compose.yml ]] || fail "Missing docker-compose.yml"
docker compose config -q || fail "Invalid Compose configuration"
log "Building and starting containers"
docker compose up -d --build
log "Checking health"
# Resolve APP_PORT from the existing environment on repeated installation.
ACTUAL_PORT="$(sed -n 's/^APP_PORT=//p' .env | tail -n 1)"
[[ "$ACTUAL_PORT" =~ ^[0-9]+$ ]] || fail "Invalid APP_PORT in .env"
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:$ACTUAL_PORT/health" >/dev/null 2>&1; then
    log "MailPilot is healthy on http://127.0.0.1:$ACTUAL_PORT"
    log "Configure an HTTPS reverse proxy to this localhost address before public access."
    exit 0
  fi
  sleep 2
done
docker compose ps
fail "Health check failed. Inspect: cd $DIR && docker compose logs --tail=100"
