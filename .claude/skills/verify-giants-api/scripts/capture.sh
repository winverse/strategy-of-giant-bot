#!/usr/bin/env bash
# Drive one HTTP request against the verification instance and keep the proof.
#   capture.sh http <label> <METHOD> <path-with-query>   e.g. capture.sh http vaa-scores GET '/api/v1/assets?strategy=VAA'
#   capture.sh db   <label>                              snapshot of the Tickers cache
# Writes <label>.* into the run's evidence dir and prints the status line.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
STATE="$REPO/.verify/giants-api/run/state.env"
[ -f "$STATE" ] || { echo "capture: no instance (run launch.sh)" >&2; exit 1; }
# shellcheck disable=SC1090
. "$STATE"

kind="${1:?usage: capture.sh http|db <label> ...}"
label="${2:?label required}"
out="$EVIDENCE/$label"

case "$kind" in
  http)
    method="${3:?METHOD required}"
    path="${4:?path required}"
    # POST /api/v1/assets sends both reports to Telegram. This instance only has
    # placeholder Telegram credentials, so the send can't be proven here; never fire it.
    if [ "$method" = "POST" ] && [[ "$path" == /api/v1/assets* ]]; then
      echo "capture: refusing POST $path (Telegram send; see features/telegram-dispatch.md)" >&2
      exit 2
    fi
    url="$API_URL$path"
    {
      echo "$method $url"
      echo "at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } >"$out.request.txt"
    meta="$(curl -sS -X "$method" -D "$out.headers.txt" -o "$out.body" \
      -w '%{http_code} %{time_total}s' --max-time 120 "$url")"
    echo "$meta" >"$out.status.txt"
    if jq . "$out.body" >"$out.json" 2>/dev/null; then rm "$out.body"; else rm -f "$out.json"; mv "$out.body" "$out.txt"; fi
    echo "$label: $method $path -> $meta ($(ls "$out".json "$out".txt 2>/dev/null))"
    ;;
  db)
    psql -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c \
      'select ticker, date, cardinality(raw) as price_rows, raw[1]->>'"'"'date'"'"' as newest from "Tickers" order by ticker, id' \
      >"$out.db.txt"
    echo "$label: $(grep -c '|' "$out.db.txt" | awk '{print $1-1}') cached rows -> $out.db.txt"
    ;;
  *)
    echo "capture: unknown kind $kind" >&2
    exit 1
    ;;
esac
