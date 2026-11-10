# giants-strategy-bot verification map

This directory is the maintained source for verifying the user-facing behavior of the giants-strategy-bot API. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.claude/skills/verify-giants-api/scripts/launch.sh` and require `launch: ready`.
- Run `.claude/skills/verify-giants-api/scripts/doctor.sh` and require exit 0.
- A fresh instance has an empty `Tickers` cache. The first request for a ticker on a given day fetches live Equibles prices.
- Never drive an instance that was not started by this verification run (for example a developer's `start:dev` on port 5002).

## Driving conventions

- Run everything from the repo root, with `S=.claude/skills/verify-giants-api/scripts`.
- Drive HTTP only through `$S/capture.sh http <label> <METHOD> <path>`, so every request leaves proof.
- Use uppercase strategy values `VAA` and `DAA`.
- Label captures `<feature>-<step>-<what>` so the evidence dir reads in order.
- Take a `$S/capture.sh db <label>` snapshot before and after any step that should touch the cache.

## Proof and skip reporting

- Report proof is the report text, the scores JSON from the same instance, and `$S/check-report.sh` output with exit 0.
- Cache proof is a before and an after `db` snapshot, plus the response time of the repeat.
- Record which entry point (route and strategy) each artifact came from. The label does this.
- Report an unreachable path with the attempted command and the unmet precondition. Telegram dispatch is unreachable on this instance by design.
- Do not report a skipped entry point as verified through a different path. A correct `GET /reports` does not prove the Telegram send.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections, in this order:

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-giants-api` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Strategy report](./strategy-report.md) covers the VAA and DAA "what to buy" text that the bot posts, checked against the README rules.
- [Momentum scores](./momentum-scores.md) covers the per-ticker score JSON for each strategy group and its input validation.
- [Price cache](./price-cache.md) covers the once-per-day Equibles fetch stored in Postgres and reused by later requests.
- [Telegram dispatch](./telegram-dispatch.md) covers the POST route and weekday cron that send reports to Telegram. It cannot be driven on this instance.
