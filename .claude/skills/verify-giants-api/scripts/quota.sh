#!/usr/bin/env bash
# How much of today's Equibles quota is left for the developer's key?
#   quota.sh [needed]     needed defaults to 17 (a full pass from an empty cache)
# Sends ONE small Equibles request (it counts against the quota) and prints the
# X-RateLimit-* headers. Exit 0 only if Remaining >= needed. The key is read from
# apps/server/config/development.ts and passed to curl on stdin, never printed.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
SERVER="$REPO/apps/server"
needed="${1:-17}"

key="$(cd "$SERVER" && bun -e 'const { config } = await import("./config/development.ts"); process.stdout.write(config.financeApiKey ?? "")')"
[ -n "$key" ] || { echo "quota: no financeApiKey in apps/server/config/development.ts" >&2; exit 1; }

since="$(date -u -v-7d +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)"
headers="$(printf 'Authorization: Bearer %s\n' "$key" |
  curl -sS -o /dev/null -D - -H @- --max-time 30 \
    "https://api.equibles.com/v1/stocks/SPY/prices?startDate=$since&limit=1")"
unset key

status="$(head -1 <<<"$headers" | awk '{print $2}')"
field() { grep -i "^$1:" <<<"$headers" | head -1 | cut -d: -f2- | tr -d ' \r'; }
limit="$(field X-RateLimit-Limit)"
remaining="$(field X-RateLimit-Remaining)"
reset="$(field X-RateLimit-Reset)"
reset_local="$( [ -n "$reset" ] && (date -r "$reset" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || date -d "@$reset" '+%Y-%m-%d %H:%M %Z') )"

echo "quota: HTTP $status, remaining ${remaining:-?} of ${limit:-?} per day, resets ${reset_local:-?}"
if [ -z "$remaining" ]; then
  echo "quota: no X-RateLimit-Remaining header; cannot tell" >&2
  exit 1
fi
if [ "$remaining" -lt "$needed" ]; then
  echo "quota: need $needed for this pass; wait for the reset instead of launching" >&2
  exit 1
fi
