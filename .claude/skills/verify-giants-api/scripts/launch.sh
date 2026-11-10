#!/usr/bin/env bash
# Start one isolated verification instance of the giants-strategy-bot API:
# a throwaway Postgres (own data dir and port), the Prisma schema pushed into it,
# and the real server (bun src/main.ts) on its own port. Writes run/state.env.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
SERVER="$REPO/apps/server"
BASE="$REPO/.verify/giants-api"
RUN="$BASE/run"
API_PORT="${VERIFY_API_PORT:-5099}"
PG_PORT="${VERIFY_PG_PORT:-55432}"
PG_DB=giants_verify
PG_USER=verify

die() { echo "launch: $*" >&2; exit 1; }

[ -e "$RUN/state.env" ] && die "an instance already exists ($RUN/state.env). Run doctor.sh to inspect it or cleanup.sh to remove it."
for tool in initdb pg_ctl createdb psql pg_isready bun curl lsof; do
  command -v "$tool" >/dev/null || die "missing $tool on PATH (Postgres.app bin provides the pg tools)"
done
for port in "$API_PORT" "$PG_PORT"; do
  lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1 && die "port $port is in use; pick others with VERIFY_API_PORT / VERIFY_PG_PORT"
done
[ -f "$SERVER/config/development.ts" ] || die "missing apps/server/config/development.ts (holds the Equibles key)"
[ -d "$REPO/node_modules/.prisma/client" ] || die "Prisma client not generated; run: cd apps/server && bun run prisma:generate"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE="$BASE/evidence/$STAMP"
DATABASE_URL="postgresql://$PG_USER@127.0.0.1:$PG_PORT/$PG_DB?schema=public"
mkdir -p "$RUN" "$EVIDENCE"

cat >"$RUN/state.env" <<EOF
API_PORT=$API_PORT
API_URL=http://127.0.0.1:$API_PORT
PG_PORT=$PG_PORT
PG_DB=$PG_DB
PG_USER=$PG_USER
DATABASE_URL='$DATABASE_URL'
RUN=$RUN
EVIDENCE=$EVIDENCE
SERVER=$SERVER
EOF

echo "launch: postgres on 127.0.0.1:$PG_PORT (data $RUN/pgdata)"
initdb -D "$RUN/pgdata" -U "$PG_USER" --auth=trust -E UTF8 --no-locale >"$RUN/initdb.log" 2>&1
pg_ctl -D "$RUN/pgdata" -o "-p $PG_PORT -k $RUN -c listen_addresses=127.0.0.1" -l "$RUN/postgres.log" -w start >/dev/null
echo "PG_PID=$(head -1 "$RUN/pgdata/postmaster.pid")" >>"$RUN/state.env"
createdb -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" "$PG_DB"

echo "launch: prisma db push"
(cd "$SERVER" && DATABASE_URL="$DATABASE_URL" bunx --bun prisma db push) >"$RUN/prisma.log" 2>&1 \
  || die "prisma db push failed; see $RUN/prisma.log (then run cleanup.sh)"

echo "launch: server on 127.0.0.1:$API_PORT"
# cwd must be apps/server: Bun reads tsconfig.json from the cwd, and without its
# emitDecoratorMetadata Nest cannot inject services. Side effects of that cwd: the
# app's winston files go to apps/server/logs/ (gitignored), and Bun loads
# apps/server/.env if present, though the variables set here take precedence.
(
  cd "$SERVER"
  NODE_ENV=development PORT="$API_PORT" DATABASE_URL="$DATABASE_URL" \
  VERIFY_PG_PORT="$PG_PORT" VERIFY_PG_DB="$PG_DB" VERIFY_PG_USER="$PG_USER" \
    nohup bun --preload "$SKILL_DIR/scripts/config-preload.ts" "$SERVER/src/main.ts" >"$RUN/server.log" 2>&1 &
  echo "SERVER_PID=$!" >>"$RUN/state.env"
)
# shellcheck disable=SC1091
. "$RUN/state.env"

for _ in $(seq 1 60); do
  kill -0 "$SERVER_PID" 2>/dev/null || die "server exited during startup; see $RUN/server.log (then run cleanup.sh)"
  if grep -q 'Server is Running' "$RUN/server.log"; then
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$API_PORT/api/v1/assets?strategy=doctor")"
    if [ "$code" != "000" ]; then
      echo "launch: ready at http://127.0.0.1:$API_PORT (evidence -> $EVIDENCE)"
      exit 0
    fi
  fi
  sleep 1
done
die "server not ready after 60s; see $RUN/server.log (then run cleanup.sh)"
