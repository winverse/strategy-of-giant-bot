# Telegram dispatch

The bot posts the VAA report and then the DAA report to the Telegram chat configured as `telegram.reading`. It does this on a weekday schedule and on demand. In production, HTTP errors are also posted to the `telegram.error` chat.

## Sub-features

- `dispatch-post` sends both reports when `POST /api/v1/assets` is called.
- `dispatch-cron` warms the price cache at 06:00 and sends both reports at 06:01, Monday to Friday, server local time.
- `dispatch-error` posts HTTP error details to the error chat when `NODE_ENV=production`.

## How to get to it (user POV)

- Receive the posts in the Telegram `reading` chat.
- Call `POST /api/v1/assets` to send them now.

## Driving it with verify-giants-api

Preconditions:

- Not drivable on a `launch.sh` instance. It has placeholder Telegram credentials, and `capture.sh` refuses `POST /api/v1/assets`.
- Proving delivery needs a real bot token and a chat the developer agrees to receive test posts in. Both live in their own `packages/server/config/development.ts`. Ask before sending anything.

- **Report text.** Verify the text that would be sent with `strategy-report.md`. The POST builds it with the same calls in the same order: VAA, then DAA.
- **Refusal.** Run `$S/capture.sh http dispatch-1 POST /api/v1/assets`. The exit code is `2` with `capture: refusing POST /api/v1/assets (Telegram send …)`, and nothing is sent.
- **Real send, only with explicit consent.** With the developer's real Telegram values in their config, start their own server (`cd packages/server && bun run start:dev`) and call `curl -X POST http://127.0.0.1:5002/api/v1/assets`. Expect `201`, then two posts in the `reading` chat starting `[VAA Strategy]` and `[DAA Strategy]`. Capture a screenshot of the chat as proof.
- **Proof.** Report `dispatch-post` and `dispatch-cron` as skipped, with the unmet precondition "no Telegram credentials on the verification instance", unless the consented real send was done.

## Gotchas

- The POST returns `201` before the message is sent. The send runs in a `setTimeout`, so a `201` proves nothing about delivery.
- A Telegram failure there is not reported to the HTTP caller. Look in the server log.
- Never set `NODE_ENV=production` on a verification instance. It loads `config/production.ts` and posts every HTTP error to the error chat.
- A verification instance left running past 06:01 on a weekday will attempt the cron send with the placeholder token. Run `cleanup.sh` promptly.
