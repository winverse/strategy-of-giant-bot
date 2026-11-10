# Strategy report

The strategy report is the Korean text the bot posts to Telegram. For VAA it names the one ticker to buy. For DAA it gives the offense share, the top offense tickers, the defense ticker, and a per-ticker weight line. Each report lists every ticker's momentum score, based on last month's final trading day.

## Sub-features

- `report-vaa` buys the best offense ticker, or the best defense ticker when any offense score is negative.
- `report-daa` sizes offense by positive canaries (2: 100%, 1: 50%, 0: 0%), buys the top 6/3/0 offense tickers, and puts the rest in the best defense ticker.
- `report-base-date` states the month-end base date (`기준일: YYYY-MM-DD (월말 종가)`): the last trading day of the previous month.
- `report-score-list` lists every strategy ticker once, with its description and score, highest first.

## How to get to it (user POV)

- Read the Telegram post sent on weekdays at 06:01 (see `telegram-dispatch.md`, not drivable here).
- Call `GET /api/v1/assets/reports?strategy=VAA` or `?strategy=DAA`. It returns the same text without sending it.

## Driving it with verify-giants-api

Preconditions:

- `$S/quota.sh` exits 0 (a fresh instance spends 17 Equibles requests).
- A fresh instance from `$S/launch.sh`, and `$S/doctor.sh` exits 0 showing `0 cached rows`.
- `S=.claude/skills/verify-giants-api/scripts` in the shell.

- **Cache before.** Run `$S/capture.sh db report-0-cache`. It reports `0 cached rows`.
- **VAA report.** Run `$S/capture.sh http report-1-vaa GET '/api/v1/assets/reports?strategy=VAA'`. Status is `200`, taking 1–3 s on a fresh cache, and `report-1-vaa.txt` starts with `[VAA Strategy]`, then `날짜:` (today) and `기준일:` (last trading day of last month).
- **VAA scores.** Run `$S/capture.sh http report-2-vaa-scores GET '/api/v1/assets?strategy=VAA'`. Status is `200` with groups `offense` (SPY, VEA, VWO, AGG) and `defense` (SHY, IEF, LQD).
- **VAA rule check.** Run `$S/check-report.sh VAA report-2-vaa-scores report-1-vaa`. Exit is `0`, with `ok` lines for the bought group and ticker and its score.
- **DAA report.** Run `$S/capture.sh http report-3-daa GET '/api/v1/assets/reports?strategy=DAA'`. Status is `200`, and `report-3-daa.txt` starts with `[DAA Strategy]` and contains `종목별 매수 금액 비율:`.
- **DAA scores.** Run `$S/capture.sh http report-4-daa-scores GET '/api/v1/assets?strategy=DAA'`. Status is `200` with groups `canary` (BND, VWO), `offense` (12 tickers) and `defense` (SHY, IEF, LQD).
- **DAA rule check.** Run `$S/check-report.sh DAA report-4-daa-scores report-3-daa`. Exit is `0`, with `ok` lines for the canary count, offense share, top-N list, defense share and defense pick.
- **Cache after.** Run `$S/capture.sh db report-5-cache`. It reports `17 cached rows`: the 7 VAA tickers plus 10 DAA-only tickers, all dated today as `yy-MM-dd`.
- **Proof.** Keep `report-1-vaa.txt`, `report-3-daa.txt`, both scores JSONs, both `.check.txt` files and both cache snapshots. Together they show the action, the decision, and that it follows the rules.

## Gotchas

- `strategy` is case-insensitive on this route too (`?strategy=vaa` works). A missing, empty, repeated (`?strategy=VAA&strategy=DAA`) or unknown `strategy` returns `400 BAD_REQUEST`.
- With the Equibles daily quota spent, the first report request on a fresh instance returns `500` with `"message": "Equibles <TICKER>: Request failed with status code 429"` in about 1 s instead of `200` (see `price-cache.md`).
- A non-HTTP error in this route reaches the client as a JSON `500` whose `message` is the original error, and `server.log` has its stack. That is the verification instance's `NODE_ENV=development`; with `NODE_ENV=production` the client gets `"message": "Internal server error"` (`clientMessage` in `src/common/filters/http-exception.filter.ts`, covered by its spec) while the log keeps the original. To reproduce on a throwaway instance whose VAA tickers are cached, empty one row (`update "Tickers" set raw = '{}' where ticker = 'AGG'` in its Postgres) and request the VAA report: the body is `{"statusCode":500,"message":"undefined is not an object (evaluating 'base.adjustedClose')"}`. Older evidence shows a plain-text `500` with `FST_ERR_BAD_STATUS_CODE` in the log instead.
- The DAA weight line rounds each offense slice to two decimals, so six picks print `16.67%` each (100.02% total). That is not a failure.
- Momentum scores weight each period's unrounded return and round only the weighted value (`src/strategy/momentum/score.ts`), so a recompute with the README formula matches within two-decimal rounding (IEF 31.93 both ways on 2026-11-10). Each weighted term and their sum are rounded separately, so a rare 0.01–0.02 difference is not a failure. Evidence from before commit `564d097` rounded first and drifts by up to about 0.1 (IEF 31.97 then).
- Ties: when two scores are equal, the report and `check-report.sh` keep the earlier ticker in the group's list order. If they disagree only on a tie, check whether the tie-break changed.
- `날짜` is the server's local date, and `기준일` comes from the price data, so a run just after midnight or on the 1st of a month can shift both.
