#!/usr/bin/env bash
# Check a captured report against the README strategy rules, using the scores the
# same instance returned. Independent of the app's allocation code: the rules are re-derived here with jq.
#   check-report.sh VAA <scores-label> <report-label>
#   check-report.sh DAA <scores-label> <report-label>
# Ties go to the earlier ticker in the group (stable sort), as in the app.
# Writes <report-label>.check.txt into the evidence dir; exit 0 only if every expected line is in the report.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$SKILL_DIR/../../.." && pwd)"
STATE="$REPO/.verify/giants-api/run/state.env"
[ -f "$STATE" ] || { echo "check-report: no instance (run launch.sh)" >&2; exit 1; }
# shellcheck disable=SC1090
. "$STATE"

strategy="${1:?VAA or DAA}"
scores="$EVIDENCE/${2:?scores label}.json"
report="$EVIDENCE/${3:?report label}.txt"
out="$EVIDENCE/$3.check.txt"
[ -f "$scores" ] || { echo "check-report: missing $scores" >&2; exit 1; }
[ -f "$report" ] || { echo "check-report: missing $report" >&2; exit 1; }

case "$strategy" in
  VAA)
    expected="$(jq -r '
      (map({(.group): .tickers}) | add) as $g
      | ($g.offense | any(.momentumScore < 0)) as $neg
      | (if $neg then $g.defense else $g.offense end | sort_by(-.momentumScore) | .[0]) as $pick
      | "\(if $neg then "안전" else "공격" end)자산 중 구매 종목은 \($pick.name) 이며",
        "모멘텀 스코어 점수는 \($pick.momentumScore) 입니다."' "$scores")"
    ;;
  DAA)
    expected="$(jq -r '
      (map({(.group): .tickers}) | add) as $g
      | ([$g.canary[] | select(.momentumScore > 0)] | length) as $c
      | (50 * $c) as $ratio
      | ([$g.offense | sort_by(-.momentumScore) | .[0:(6 * $ratio / 100)][] | .name]) as $top
      | (if $ratio < 100 then [$g.defense | sort_by(-.momentumScore) | .[0].name] else [] end) as $def
      | "카나리아 자산 중 모멘텀 스코어 수치가 Plus인 종목의 개수는 \($c)입니다.",
        "공격 자산 매수 금액 비율: \($ratio)%",
        "공격 자산 중 모멘텀 스코어 상위 \($top | length)개 종목: \(if ($top | length) > 0 then ($top | join(",")) else "구매 종목 없음" end)",
        "안전 자산 매수 금액 비율: \(100 - $ratio)%",
        "안전 자산 중 구매 종목: \(if ($def | length) > 0 then $def[0] else "구매 종목 없음" end)"' "$scores")"
    ;;
  *)
    echo "check-report: strategy must be VAA or DAA" >&2
    exit 1
    ;;
esac

fail=0
: >"$out"
while IFS= read -r line; do
  if grep -qF -- "$line" "$report"; then
    echo "ok    $line" | tee -a "$out"
  else
    echo "FAIL  $line" | tee -a "$out"
    fail=1
  fi
done <<<"$expected"
exit "$fail"
