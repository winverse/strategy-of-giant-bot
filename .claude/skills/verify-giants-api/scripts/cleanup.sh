#!/usr/bin/env bash
# Tear down what launch.sh started (by recorded pid and data dir, never by process
# name), copy logs into the evidence dir, and delete the run dir. Evidence stays.
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
RUN="$REPO/.verify/giants-api/run"
STATE="$RUN/state.env"

if [ ! -f "$STATE" ]; then
  [ -d "$RUN" ] && echo "cleanup: $RUN has no state.env; inspect it, then remove it by hand" >&2
  echo "cleanup: nothing to clean"
  exit 0
fi
# shellcheck disable=SC1090
. "$STATE"

if [ -n "${SERVER_PID:-}" ] && ps -p "$SERVER_PID" -o command= 2>/dev/null | grep -q "$SERVER/src/main.ts"; then
  kill "$SERVER_PID"
  for _ in $(seq 1 10); do kill -0 "$SERVER_PID" 2>/dev/null || break; sleep 0.5; done
  kill -0 "$SERVER_PID" 2>/dev/null && kill -9 "$SERVER_PID"
  echo "cleanup: stopped server pid $SERVER_PID"
fi

if [ -f "$RUN/pgdata/postmaster.pid" ]; then
  pg_ctl -D "$RUN/pgdata" -m fast -w stop >/dev/null && echo "cleanup: stopped postgres (port $PG_PORT)"
fi

mkdir -p "$EVIDENCE/logs"
for log in server.log postgres.log prisma.log initdb.log; do
  [ -f "$RUN/$log" ] && cp "$RUN/$log" "$EVIDENCE/logs/$log"
done

rm -rf "$RUN"
echo "cleanup: removed $RUN"
echo "cleanup: evidence kept at $EVIDENCE"
