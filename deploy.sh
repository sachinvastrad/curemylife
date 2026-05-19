#!/usr/bin/env bash
#
# CureMyLife — VPS deploy script (pull → configure → build → deploy)
#
# Usage on the VPS:
#   ./deploy.sh                 # API on 9000, web on 3000
#   ./deploy.sh 9000            # API on 9000 (port "onboarded" as arg 1)
#   ./deploy.sh 9000 8080       # API on 9000, web on 8080
#
# First time only: copy just this file to the VPS and run it — it will
# clone the repo itself. After that it lives inside the repo and self-updates.
#
set -euo pipefail

# ============================================================
#  CONFIG  — edit these before the first run
# ============================================================
REPO_URL="https://github.com/sachinvastrad/curemylife.git"
BRANCH="main"
APP_DIR="${APP_DIR:-$HOME/curemylife}"      # where the repo lives on the VPS

VPS_IP="REPLACE_WITH_VPS_PUBLIC_IP"          # public IP/host users will hit

# MySQL (already installed on this VPS)
DB_USER="homeo"
DB_PASS="REPLACE_DB_PASSWORD"
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_NAME="homeopinion"

# App secrets — set REAL values (the old .tok.txt JWT was leaked, do not reuse it)
JWT_SECRET="REPLACE_JWT_SECRET"
JWT_REFRESH_SECRET="REPLACE_JWT_REFRESH_SECRET"
OPENAI_API_KEY=""                            # optional; blank = AI mock fallback

# Ports — passed as args (default API 9000, web 3000)
API_PORT="${1:-9000}"
WEB_PORT="${2:-3000}"
# ============================================================
#  END CONFIG
# ============================================================

API_PUBLIC_URL="http://${VPS_IP}:${API_PORT}"
WEB_PUBLIC_URL="http://${VPS_IP}:${WEB_PORT}"
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

log() { echo -e "\n\033[1;36m== $* ==\033[0m"; }
die() { echo -e "\033[1;31mERROR: $*\033[0m" >&2; exit 1; }

[ "$VPS_IP" != "REPLACE_WITH_VPS_PUBLIC_IP" ] || die "Edit the CONFIG block first (VPS_IP, DB_PASS, JWT secrets)."
command -v git  >/dev/null || die "git not installed"
command -v node >/dev/null || die "node not installed"
command -v npm  >/dev/null || die "npm not installed"

# ---- 1. PULL ----------------------------------------------
log "1/4  Pull source from GitHub ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
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
  npm run build )               # -> backend/dist/main.js

( cd frontend
  npm ci
  NEXT_PUBLIC_API_URL="$API_PUBLIC_URL" npm run build )   # -> frontend/.next

# ---- 4. DEPLOY (pm2) --------------------------------------
log "4/4  Deploy with pm2"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# Resolve the compiled NestJS entrypoint (dist/main.js, or dist/src/main.js
# on older builds) so pm2 always gets a valid path.
if   [ -f "$APP_DIR/backend/dist/main.js" ];     then API_ENTRY="dist/main.js"
elif [ -f "$APP_DIR/backend/dist/src/main.js" ]; then API_ENTRY="dist/src/main.js"
else die "Backend build produced no main.js — check the 3/4 build output."
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
        MAX_FILE_SIZE: "26214400"
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

# startOrReload = first run starts, redeploys reload with zero downtime
pm2 startOrReload "$APP_DIR/ecosystem.config.js" --update-env
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
