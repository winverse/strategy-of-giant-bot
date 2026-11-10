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

- `strategy` is case-insensitive on this route too (`?strategy=vaa` works). A missing, empty or unknown `strategy` returns `400 BAD_REQUEST`.
- A non-HTTP error in this route reaches the client as a plain-text `500`, and `server.log` shows `FST_ERR_BAD_STATUS_CODE ... invalid status code: undefined`. Read the stack above it for the real cause.
- The DAA weight line rounds each offense slice to two decimals, so six picks print `16.67%` each (100.02% total). That is not a failure.
- Momentum scores round each period's return to two decimals before weighting (×12 for one month). A recompute with the README formula and no rounding drifts by up to about 0.1 (observed 31.93 vs 31.97 for IEF). Compare to the app's rounding order when recomputing by hand.
- Ties: when two scores are equal, the report and `check-report.sh` keep the earlier ticker in the group's list order. If they disagree only on a tie, check whether the tie-break changed.
- `날짜` is the server's local date, and `기준일` comes from the price data, so a run just after midnight or on the 1st of a month can shift both.
