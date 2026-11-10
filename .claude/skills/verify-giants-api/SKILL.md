---
name: verify-giants-api
description: Launch an isolated instance of the giants-strategy-bot API (apps/server, NestJS on Bun with Postgres and live Equibles prices), drive its HTTP endpoints the way the Telegram report is produced, and capture proof. Use to confirm that a change to the server (strategy reports, momentum scores, price fetching or caching, config, routing) works in the running app, not just in unit tests.
---

# Verify the giants-strategy-bot API

The user-facing product is the **Telegram report**: the server computes VAA/DAA momentum scores from Equibles month-end prices and posts "what to buy" text to a Telegram chat. The HTTP API in `apps/server` is the surface you drive. `GET /api/v1/assets/reports` returns the exact text the bot posts. `apps/web` is a Next.js setup with no screens yet, so it has no product surface to drive.

All commands run from the repo root. Helpers live in `.claude/skills/verify-giants-api/scripts/` (below, `S=.claude/skills/verify-giants-api/scripts`).

## Launch

```sh
S=.claude/skills/verify-giants-api/scripts
$S/quota.sh           # Equibles requests left today; exit 1 below 17 (a full pass)
$S/launch.sh          # optional: VERIFY_API_PORT=5099 VERIFY_PG_PORT=55432 (defaults)
```

Run `quota.sh` first. It spends one request and stops you before a pass the daily quota can't finish (see Isolation and cost).

From an empty state this:

1. Runs `initdb` for a throwaway Postgres in `.verify/giants-api/run/pgdata` on `127.0.0.1:$VERIFY_PG_PORT`, with trust auth for user `verify` and database `giants_verify`.
2. Runs `bunx --bun prisma db push` into it. That is the whole schema: one `Tickers` table, no seed data. The database is new and empty, so the push needs no `--accept-data-loss`. Prisma 7 refuses that flag from an AI agent without the user's consent, so keep it out.
3. Starts the real server, `bun src/main.ts` from `apps/server`, with `NODE_ENV=development` on `$VERIFY_API_PORT`.
4. Waits until the log says `Server is Running` and HTTP answers. That takes about 5 s.

It prints `launch: ready at http://127.0.0.1:5099 (evidence -> <dir>)` and records ports, PIDs and the evidence dir in `.verify/giants-api/run/state.env`. It refuses if an instance already exists or a port is taken.

**Why the preload.** `src/config/configuration.ts` loads `#env/development` (the `imports` map in `apps/server/package.json` resolves it to `config/development.ts`) unless `NODE_ENV` is `production` or `test`. The checkout's `config/development.ts` has empty Telegram and database values, and the server's Joi config check rejects them, so `bun run start:dev` cannot start. `scripts/config-preload.ts` (a `bun --preload` plugin) changes only what Bun loads for that file. It keeps the developer's values, including the Equibles key, points `database` at the throwaway Postgres, and fills Telegram with `verify-placeholder`. The file on disk is never written, and no product code changes. The plugin matches the resolved file path, so it works through the `#env/*` alias. If launch dies with `config-preload: expected exactly one "export const config ="`, the config file changed shape. Update the preload. If it dies with `config validate failed`, the preload did not apply: check that `configuration.ts` still loads `config/development.ts` for `NODE_ENV=development`.

Requirements: the Postgres.app tools (`initdb`, `pg_ctl`, `createdb`, `psql`, `pg_isready`) on `PATH`, plus `bun`, `jq`, `curl` and `lsof`. The Prisma client must be generated (`node_modules/.prisma/client`), and `apps/server/config/development.ts` must hold a working `financeApiKey`.

## Doctor

```sh
$S/doctor.sh
```

This is read-only and exits 0 only if all of these hold:

- the recorded server PID runs this repo's `src/main.ts` and owns the API port
- our Postgres PID is ready on its port
- the `Tickers` table answers (it prints the cached row count)
- `GET /api/v1/assets?strategy=doctor` returns `400 BAD_REQUEST` (no Equibles call)
- `server.log` has no startup or unhandled errors

Run it first, and again whenever anything looks off. Never drive an instance that `doctor.sh` does not vouch for, such as a developer's `start:dev` on port 5002.

## Drive

Drive over HTTP with `capture.sh`, which saves the request, status and timing, headers, and the body (`.json`, or `.txt` for the plain-text report) to the evidence dir:

```sh
$S/capture.sh http <label> GET '/api/v1/assets/reports?strategy=VAA'   # report text (what Telegram gets)
$S/capture.sh http <label> GET '/api/v1/assets?strategy=DAA'           # momentum scores JSON
$S/capture.sh db   <label>                                             # Tickers cache snapshot
$S/check-report.sh VAA <scores-label> <report-label>                   # report vs README rules
```

Routes are under the global prefix `/api` with URI version `v1`, so `/api/v1/assets…`. Strategy values are `VAA` and `DAA`, in any case (`vaa` works too). `check-report.sh` re-derives the expected picks from the captured scores with jq, following the README rules rather than the app's allocation code (`src/strategy/allocation/`), and checks that the report text states them.

`capture.sh` refuses `POST /api/v1/assets`. That route sends both reports to the real Telegram `reading` chat, and this instance has only placeholder credentials. See `features/telegram-dispatch.md`.

Feature recipes are in [`features/README.md`](features/README.md). A proof that drives one convenient entry point is incomplete when the map lists others.

## Evidence

- Location: `.verify/giants-api/evidence/<UTC stamp>/`, gitignored and created by `launch.sh`. Server, Postgres, Prisma and initdb logs are copied to `logs/` there at cleanup.
- Proof standards:
  - Drive the real HTTP path that produces the Telegram text, not the allocation functions directly. The property test in `verify-allocation-rules` covers the logic alone.
  - Capture the action and the resulting state. Take a cache snapshot before and after, and keep the report text, the scores JSON it came from, and `check-report.sh` output.
  - Verify side effects. A first request of the day must add one `Tickers` row per newly fetched ticker, dated today as `yy-MM-dd`, and a repeat must add none.
  - Mocks only where a production boundary already isolates the system: here only Telegram, which is not exercised. Equibles is called for real.

## Cleanup

```sh
$S/cleanup.sh
```

This stops the server and Postgres by recorded PID and data dir (never by process name), copies logs into the evidence dir, and deletes `.verify/giants-api/run/`. It prints `evidence kept at <dir>`, and the evidence survives. Run it after every run, including failed launches. Clean up promptly: the server schedules weekday cron jobs at 06:00 and 06:01 local time, and the 06:01 job would try to post to Telegram with the placeholder token.

## Isolation and cost

- One instance per checkout, since state lives in `.verify/giants-api/run`. A second checkout can run side by side with different `VERIFY_API_PORT` and `VERIFY_PG_PORT`. The developer's own Postgres on 5432 and server on 5002 are never touched.
- Side effects outside `.verify/`:
  - The app's winston logger writes to `apps/server/logs/` (gitignored). The server must run from `apps/server`, because Bun reads `tsconfig.json` from the cwd and without its decorator metadata Nest's dependency injection fails.
  - Bun loads `apps/server/.env` if it exists, but the `PORT` and `DATABASE_URL` set by `launch.sh` win.
- Each fresh instance re-fetches prices from Equibles with the developer's key: 7 requests for VAA, plus 10 more for DAA's other tickers. Repeat requests the same day hit the cache.
- Equibles allows **100 requests per key per day** (`X-RateLimit-Limit: 100`, observed 2026-11-10), reset at 00:00 UTC (09:00 KST). That is about five full passes a day, shared with the developer's own server. Once it is spent, a 429 is not retried (`isTransientEquiblesError` in `src/price/equibles.client.ts`): each uncached ticker makes one rejected call, and the request returns `500 {"statusCode":500,"message":"Equibles <TICKER>: Request failed with status code 429"}` in about 1 s with nothing cached. Stop at the first 429 and report the rest of the pass as blocked until the reset.
- A failed fetch is logged as an `EquiblesError` (ticker, status, message) without the axios request, so `server.log` does not hold the API key (checked 2026-11-10). Older builds dumped the request with its `Authorization: Bearer` header. `cleanup.sh` still masks bearer tokens when it copies logs into the evidence dir, as a safeguard.

## Helpers

| Script | Invocation | Purpose |
| --- | --- | --- |
| `quota.sh` | `$S/quota.sh [needed]` | one Equibles request; print today's remaining quota, exit 1 below `needed` (17) |
| `launch.sh` | `$S/launch.sh` | start Postgres + schema + server, wait for ready |
| `doctor.sh` | `$S/doctor.sh` | read-only health check of the instance |
| `capture.sh` | `$S/capture.sh http <label> <METHOD> <path>` / `$S/capture.sh db <label>` | drive one request or snapshot the cache, saving proof |
| `check-report.sh` | `$S/check-report.sh VAA\|DAA <scores-label> <report-label>` | check report text against the README rules |
| `cleanup.sh` | `$S/cleanup.sh` | tear down, keep evidence (bearer tokens masked in copied logs) |
| `config-preload.ts` | used by `launch.sh` | swap in verification config without writing the config file |

Use `/pstack:maintain-verification-skill` to keep this skill and its feature map in step with the app.
