# Momentum scores

The scores route returns, for one strategy, each ticker group with every ticker's momentum score. For each ticker it also returns the four month-end comparisons the score is built from. Each comparison has its from/to dates, the period return, and the weighted return (×12, ×4, ×2, ×1).

## Sub-features

- `scores-groups` returns the strategy's groups in order: VAA `offense`, `deffense`; DAA `canary`, `offense`, `deffense`.
- `scores-outline` returns four comparisons per ticker, all ending on the same base date (last trading day of last month) and starting 1, 3, 6 and 12 months earlier.
- `scores-validation` rejects an unknown strategy with `400 BAD_REQUEST`.

## How to get to it (user POV)

- Call `GET /api/v1/assets?strategy=VAA` or `?strategy=DAA`. Lowercase values are accepted here.

## Driving it with verify-giants-api

Preconditions:

- An instance from `$S/launch.sh`, and `$S/doctor.sh` exits 0.
- `S=.claude/skills/verify-giants-api/scripts` in the shell.

- **VAA scores.** Run `$S/capture.sh http scores-1-vaa GET '/api/v1/assets?strategy=VAA'`. Status is `200`, and `jq -c '.[] | {group, n: (.tickers | length)}' <evidence>/scores-1-vaa.json` prints `offense` 4 and `deffense` 3.
- **Outline shape.** Run `jq -c '.[0].tickers[0].outline | map([.from, .to, .adjustedReturn])' <evidence>/scores-1-vaa.json`. It shows four rows with one shared `to` date. The `from` dates are the month-ends 1, 3, 6 and 12 months before that, each moved back to the last trading day.
- **Score sums its parts.** Run `jq '.[0].tickers[0] | [.momentumScore, (.outline | map(.adjustedReturn) | add)]' <evidence>/scores-1-vaa.json`. The two numbers agree to two decimals.
- **Lowercase accepted.** Run `$S/capture.sh http scores-2-lower GET '/api/v1/assets?strategy=vaa'`. Status is `200` with the same groups.
- **Unknown strategy.** Run `$S/capture.sh http scores-3-bad GET '/api/v1/assets?strategy=XYZ'`. Status is `400`, and the JSON includes `"message": "BAD_REQUEST"`.
- **Proof.** Keep `scores-1-vaa.json`, `scores-2-lower.json` and `scores-3-bad.json`.

## Gotchas

- The group is spelled `deffense` (double f) in the API. Use that key in jq.
- In DAA, VWO is in both `canary` and `offense`, and LQD in both `offense` and `deffense`. Each appearance is its own entry with the same score.
- A missing `strategy` returns `500` with plain text, not `400`.
- On a fresh cache the first call takes 1–3 s per strategy (live Equibles fetch). Later calls take milliseconds.
