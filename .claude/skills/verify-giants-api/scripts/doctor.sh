#!/usr/bin/env bash
# Read-only: is the verification instance worth driving? Exit 0 only if every check passes.
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
STATE="$REPO/.verify/giants-api/run/state.env"
fail=0
ok() { echo "ok    $*"; }
bad() { echo "FAIL  $*"; fail=1; }

[ -f "$STATE" ] || { echo "FAIL  no instance: $STATE missing (run launch.sh)"; exit 1; }
# shellcheck disable=SC1090
. "$STATE"

if ps -p "$SERVER_PID" -o command= 2>/dev/null | grep -q "$SERVER/src/main.ts"; then
  ok "server pid $SERVER_PID runs $SERVER/src/main.ts"
else
  bad "server pid $SERVER_PID is gone or is not this repo's server"
fi

if lsof -a -p "$SERVER_PID" -iTCP:"$API_PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  ok "port $API_PORT is owned by our server"
else
  bad "port $API_PORT is not owned by pid $SERVER_PID"
fi

if pg_isready -q -h 127.0.0.1 -p "$PG_PORT" && [ "$(head -1 "$RUN/pgdata/postmaster.pid" 2>/dev/null)" = "$PG_PID" ]; then
  ok "postgres pid $PG_PID accepts connections on $PG_PORT"
else
  bad "our postgres (pid $PG_PID, port $PG_PORT) is not ready"
fi

if rows="$(psql -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc 'select count(*) from "Tickers"' 2>&1)"; then
  ok "Tickers table present ($rows cached rows)"
else
  bad "Tickers table query failed: $rows"
fi

# An unknown strategy is rejected before any Equibles call, so this costs nothing.
body="$(curl -s -w '\n%{http_code}' "$API_URL/api/v1/assets?strategy=doctor")"
code="${body##*$'\n'}"
if [ "$code" = "400" ] && grep -q 'BAD_REQUEST' <<<"$body"; then
  ok "HTTP routing answers (unknown strategy -> 400 BAD_REQUEST)"
else
  bad "unexpected probe answer: status $code body ${body%$'\n'*}"
fi

if grep -qiE 'unhandled|ERROR \[ExceptionHandler\]' "$RUN/server.log"; then
  bad "server.log has startup/unhandled errors: $(grep -iE 'unhandled|ERROR \[ExceptionHandler\]' "$RUN/server.log" | head -1)"
else
  ok "server.log has no startup or unhandled errors"
fi

echo "evidence dir: $EVIDENCE"
exit "$fail"
