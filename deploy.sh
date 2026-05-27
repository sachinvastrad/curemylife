#!/usr/bin/env bash
#
# CureMyLife — VPS deploy script (pull → configure → build → deploy)
#
# Usage on the VPS:
#   ./deploy.sh                 # ports from deploy.config (or 9000/3000)
#   ./deploy.sh 9000            # API 9000, web from config/default
#   ./deploy.sh 9000 8080       # API 9000, web 8080
#
# Config lives in a SEPARATE git-ignored file `deploy.config` so it is
# NOT overwritten when this script does `git reset --hard`. First run:
#   cp deploy.config.example deploy.config && nano deploy.config
#
set -euo pipefail

log() { echo -e "\n\033[1;36m== $* ==\033[0m"; }
die() { echo -e "\033[1;31mERROR: $*\033[0m" >&2; exit 1; }

# ---- Load config from git-ignored deploy.config -----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-$SCRIPT_DIR/deploy.config}"

[ -f "$CONFIG_FILE" ] || die "Missing $CONFIG_FILE
  Create it once (it is git-ignored, so it survives 'git reset --hard'):
    cp \"$SCRIPT_DIR/deploy.config.example\" \"$CONFIG_FILE\"
    nano \"$CONFIG_FILE\"      # fill in VPS_IP, DB_PASS, JWT secrets"

# shellcheck disable=SC1090
source "$CONFIG_FILE"

# Defaults for anything the config didn't set
REPO_URL="${REPO_URL:-https://github.com/sachinvastrad/curemylife.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-$HOME/curemylife}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-homeopinion}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_FROM="${SMTP_FROM:-CureMyLife <noreply@curemylife.com>}"

# Ports: CLI arg wins, then config, then hard default
API_PORT="${1:-${API_PORT:-9000}}"
WEB_PORT="${2:-${WEB_PORT:-3000}}"

# Validate required values are present and not placeholders
for v in VPS_IP DB_USER DB_PASS JWT_SECRET JWT_REFRESH_SECRET; do
  val="${!v:-}"
  { [ -n "$val" ] && [[ "$val" != REPLACE_* ]]; } \
    || die "Set a real value for '$v' in $CONFIG_FILE"
done

API_PUBLIC_URL="http://${VPS_IP}:${API_PORT}"
WEB_PUBLIC_URL="http://${VPS_IP}:${WEB_PORT}"
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

if [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ]; then
  echo -e "\033[1;33mWARN: SMTP_USER/SMTP_PASS not set in $CONFIG_FILE — OTP emails will NOT be sent (logged to pm2 console only).\033[0m" >&2
fi

command -v git  >/dev/null || die "git not installed"
command -v node >/dev/null || die "node not installed"
command -v npm  >/dev/null || die "npm not installed"

# ---- 1. PULL ----------------------------------------------
# Done only on the first pass. Because the pull can replace deploy.sh
# itself, we then re-exec the freshly pulled copy and continue from a
# stable file (avoids the classic self-modification corruption).
if [ -z "${DEPLOY_REEXEC:-}" ]; then
  log "1/4  Pull source from GitHub ($BRANCH)"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
  else
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
  export DEPLOY_REEXEC=1
  exec bash "$APP_DIR/deploy.sh" "$@"
fi
cd "$APP_DIR"

# ---- 2. CONFIGURE ENV -------------------------------------
log "2/4  Write environment config"
mkdir -p backend/uploads

cat > backend/.env <<EOF
DATABASE_URL="$DATABASE_URL"
PORT=$API_PORT
FRONTEND_URL="$WEB_PUBLIC_URL"
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
JWT_REFRESH_EXPIRES_IN="30d"
OPENAI_API_KEY="$OPENAI_API_KEY"
AI_MODEL="gpt-4o"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=26214400
SMTP_HOST="$SMTP_HOST"
SMTP_PORT="$SMTP_PORT"
SMTP_USER="$SMTP_USER"
SMTP_PASS="$SMTP_PASS"
SMTP_FROM="$SMTP_FROM"
EOF

# NEXT_PUBLIC_* is baked into the frontend bundle at BUILD time
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=$API_PUBLIC_URL
EOF

# ---- 3. BUILD ---------------------------------------------
log "3/4  Install deps & build"
( cd backend
  npm ci
  npx prisma generate
  npx prisma db push            # create/update MySQL tables (no migrations folder)
  npm run db:seed-diet          # upsert foods / recipes / templates (safe to re-run)
  npm run build )               # -> backend/dist/main.js

( cd frontend
  npm ci

  # Verify animation deps resolved — these are required by the GSAP/Lenis
  # integration in src/providers and src/lib/animation. If either is missing
  # the build still succeeds (Next 16 won't fail on a client-only import path
  # until first render), so check explicitly.
  for dep in gsap lenis; do
    [ -f "node_modules/$dep/package.json" ] \
      || die "Frontend dependency '$dep' missing after npm ci — check package.json and the lockfile."
  done

  NEXT_PUBLIC_API_URL="$API_PUBLIC_URL" npm run build )   # -> frontend/.next

# ---- 4. DEPLOY (pm2) --------------------------------------
log "4/4  Deploy with pm2"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# Resolve the compiled NestJS entrypoint (dist/main.js, or dist/src/main.js
# on older builds) so pm2 always gets a valid path.
if   [ -f "$APP_DIR/backend/dist/main.js" ];     then API_ENTRY="dist/main.js"
elif [ -f "$APP_DIR/backend/dist/src/main.js" ]; then API_ENTRY="dist/src/main.js"
else
  echo "--- backend/dist tree ---" >&2
  find "$APP_DIR/backend/dist" -name '*.js' 2>/dev/null | head -20 >&2 || echo "(dist missing)" >&2
  die "Backend build produced no main.js (see tree above) — the 3/4 build failed."
fi
echo "API entrypoint: backend/$API_ENTRY"

cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: "curemylife-api",
      cwd: "$APP_DIR/backend",
      script: "$API_ENTRY",
      env: {
        NODE_ENV: "production",
        PORT: "$API_PORT",
        DATABASE_URL: "$DATABASE_URL",
        FRONTEND_URL: "$WEB_PUBLIC_URL",
        JWT_SECRET: "$JWT_SECRET",
        JWT_EXPIRES_IN: "7d",
        JWT_REFRESH_SECRET: "$JWT_REFRESH_SECRET",
        JWT_REFRESH_EXPIRES_IN: "30d",
        OPENAI_API_KEY: "$OPENAI_API_KEY",
        AI_MODEL: "gpt-4o",
        UPLOAD_DIR: "./uploads",
        MAX_FILE_SIZE: "26214400",
        SMTP_HOST: "$SMTP_HOST",
        SMTP_PORT: "$SMTP_PORT",
        SMTP_USER: "$SMTP_USER",
        SMTP_PASS: "$SMTP_PASS",
        SMTP_FROM: "$SMTP_FROM"
      }
    },
    {
      name: "curemylife-web",
      cwd: "$APP_DIR/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p $WEB_PORT",
      env: {
        NODE_ENV: "production",
        PORT: "$WEB_PORT",
        NEXT_PUBLIC_API_URL: "$API_PUBLIC_URL"
      }
    }
  ]
};
EOF

# Delete any stale/errored app definitions so pm2 cannot reuse an old
# cached script path — then start fresh from the regenerated ecosystem.
pm2 delete curemylife-api curemylife-web >/dev/null 2>&1 || true
pm2 start "$APP_DIR/ecosystem.config.js" --update-env
pm2 save

log "Done"
echo "API : $API_PUBLIC_URL/api"
echo "Web : $WEB_PUBLIC_URL"
echo
echo "  pm2 status            # process list"
echo "  pm2 logs curemylife-api"
echo "  pm2 logs curemylife-web"
echo
echo "To start on boot (run ONCE, as root, the command pm2 prints):"
echo "  pm2 startup"
echo
echo "Open firewall ports if needed:  ufw allow $API_PORT && ufw allow $WEB_PORT"
