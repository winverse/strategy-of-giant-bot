# Price cache

The first request of the day for a ticker fetches about 14 months of daily prices from Equibles. It stores them in Postgres keyed by ticker and today's date, and every later request that day reuses the stored prices instead of calling Equibles again.

## Sub-features

- `cache-fill` stores one `Tickers` row per newly fetched ticker, dated today.
- `cache-hit` serves repeat requests the same day from Postgres, adding no rows and returning in milliseconds.
- `cache-shared` reuses tickers that VAA and DAA share (SPY, VWO, LQD, SHY, IEF) across strategies.

## How to get to it (user POV)

- Any scores or report request (`GET /api/v1/assets…?strategy=…`) fills or reuses the cache.
- The weekday 06:00 cron warms it for both strategies (not drivable here).

## Driving it with verify-giants-api

Preconditions:

- A fresh instance from `$S/launch.sh`, and `$S/doctor.sh` exits 0 showing `0 cached rows`.
- `S=.claude/skills/verify-giants-api/scripts` in the shell.

- **Empty cache.** Run `$S/capture.sh db cache-0-before`. It reports `0 cached rows`.
- **Fill.** Run `$S/capture.sh http cache-1-vaa GET '/api/v1/assets/reports?strategy=VAA'`. Status is `200`, and `cache-1-vaa.status.txt` shows a time above 1 s.
- **Rows written.** Run `$S/capture.sh db cache-2-after`. It reports `7 cached rows` (AGG, IEF, LQD, SHY, SPY, VEA, VWO). Each has today's `date` as `yy-MM-dd`, about 290 `price_rows`, and a `newest` date of the last trading day before today.
- **Hit.** Run `$S/capture.sh http cache-3-repeat GET '/api/v1/assets/reports?strategy=VAA'`. Status is `200`, the time is under 0.1 s, and the body is identical: `diff <evidence>/cache-1-vaa.txt <evidence>/cache-3-repeat.txt` prints nothing.
- **No new rows.** Run `$S/capture.sh db cache-4-after-repeat`. It still reports `7 cached rows`.
- **Shared across strategies.** Run `$S/capture.sh http cache-5-daa GET '/api/v1/assets?strategy=DAA'`, then `$S/capture.sh db cache-6-after-daa`. It reports `17 cached rows`: 10 new DAA tickers, with no second row for SPY, VWO or LQD.
- **Proof.** Keep the five `db` snapshots and the status files showing slow-then-fast timing.

## Gotchas

- The cache key is the server's local date formatted `yy-MM-dd` (for example `26-11-10`), not ISO. A run that crosses local midnight re-fetches everything.
- The stored `raw` array is newest-first, as Equibles returns it. `newest` in the snapshot is `raw[1]`.
- A fresh instance always starts empty, so every verification run spends real Equibles requests (7 for VAA, 10 more for DAA). Don't loop launches.
