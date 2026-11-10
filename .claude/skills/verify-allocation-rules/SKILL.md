---
name: verify-allocation-rules
description: Check that the VAA and DAA buy decisions in giants-strategy-bot follow the strategy rules for every generated set of momentum scores, not just the hand-picked spec cases. Use before and after any change to apps/server/src/strategy/allocation/ (vaa.ts, daa.ts, select.ts), src/strategy/report/message.ts, tickersByStrategy in src/strategy/tickers.ts, twoDecimalPoint in src/common/utils/number.ts, or the strategy rules in README.md, and whenever the Telegram report's "what to buy" looks wrong.
---

# Verify the VAA/DAA allocation rules

## What is verified, in plain words

**Property.** For any finite momentum scores, the report buys exactly what the README's strategy rules say. VAA buys the single best offense ticker, or the best defense ticker once any offense score is below 0. DAA puts 50% into offense for each canary scoring above 0, splits that equally over the top 6/3/0 offense tickers, and puts the rest into the single best defense ticker. The weights add up to 100%, and the Telegram message prints those same picks.

**Harm if broken.** The bot posts the monthly buy list to Telegram, and the user rebalances real money on it. A wrong comparison (`>=` instead of `>`), a wrong count, or the wrong group silently buys the wrong assets for a month.

## Tool and why

TypeScript has no verifier that runs on the code itself, so this is **property-based testing of the real code**, not a proof. [fast-check](https://fast-check.dev) `4.10.2` (pinned exactly as a dev dependency in `apps/server/package.json`) generates momentum scores and runs the real `allocateVAA`/`allocateDAA` and `vaaMessage`/`daaMessage` functions on each set. The test then checks every decision against the rules above. On a failure, fast-check shrinks the input to a minimal counterexample.

The score generator is biased toward the cases that break this kind of code: exact `0`, ties between tickers, and negatives. It mixes integers in `[-3, 3]` with two-decimal values in `[-300, 300]`. Each ticker gets one score shared across its groups, as in production (DAA's `VWO` is canary and offense, `LQD` is offense and defense). Ticker universes come from the real `tickersByStrategy`.

## Run it

```sh
cd apps/server && bun test src/strategy/allocation/allocation.property.spec.ts
```

It takes about 1 s and runs 20,000 cases per strategy. `ALLOCATION_RUNS=200000` runs a deeper sweep. It also runs as part of plain `bun test`.

## Prove the check can still fail (run after editing the spec or the covered code)

```sh
bun .claude/skills/verify-allocation-rules/scripts/mutants.ts
```

The script first runs the spec on the unmodified code (baseline must pass). Then it applies 10 one-line breaks, one at a time, to a **copy** of `allocation/vaa.ts`, `allocation/daa.ts` or `report/message.ts` (`*.__mutant__.ts`, deleted afterward), which the spec loads through `VAA_IMPL`, `DAA_IMPL` or `MESSAGE_IMPL`, and expects each break to fail the named rule. The real files are never written. Expected output ends with `all mutants caught`. A `STALE` line means an intended code change moved a mutant's anchor text. Update that mutant's `find`/`replace` in `scripts/mutants.ts` to the new code, keeping the same break.

## Rules and what each one guards

| Rule | Plain statement | Code it guards |
| --- | --- | --- |
| V1 | VAA switches to defense exactly when some offense score is **below** 0 (0 is not negative) | `minusOffenseTickers` filter, `allocation/vaa.ts` |
| V2 | VAA buys from the group V1 chose | `isDefensive ? defense : offense` |
| V3 | VAA buys the highest score in that group | `topByScore`, `allocation/select.ts` |
| V4 | The VAA message names the same group and ticker | the `구매 종목은 … 이며` line, `report/message.ts` |
| D1 | DAA offense share = 50% × canaries scoring **above** 0; defense share = the rest | `plusCanaryCount`, `offenseRatio`, `defenseRatio`, `allocation/daa.ts` |
| D2 | DAA buys 6 / 3 / 0 distinct offense tickers at 100 / 50 / 0% | `(6 * offenseRatio) / 100` |
| D3 | No unpicked offense ticker outscores a picked one (ties at the cutoff may go either way) | `topByScore` on offense |
| D4 | No defense ticker at 100%; otherwise exactly one, the highest-scoring | `defenseRatio ? 1 : 0` and the defense call |
| D5 | Printed weights add up to 100%, within ±0.005 per printed line (two-decimal rounding: 6 × 16.67 = 100.02) | `allocations` |
| D6 | Each offense pick gets an equal slice, defense gets the rest, and the message prints each `NAME RATIO%` | `allocations` and the `종목별 매수 금액 비율` line, `report/message.ts` |

## Reading a failure: real bug or modeling error?

A failure prints the rule (`V1:` … `D6:`), a JSON detail with `scores` and the decision, and fast-check's shrunk `Counterexample`. Retell it in code terms, for example: "BND = 0 and VWO = 0, so no canary is positive; `offenseRatio` came out 100, so D1 broke at `plusCanaryCount`."

- **Real bug**: the counterexample is a set of finite scores the production pipeline can produce, and the README rule says something different from what the code did. Report it with the counterexample. Do not loosen the rule or the generator to make it pass, and do not change product code unless the user asks.
- **Modeling error**: the spec no longer matches intended behavior. Examples: the strategy rules were deliberately changed (README updated), a group was renamed (`deffense` became `defense` on 2026-11-10), the message wording changed, or the universes in `tickersByStrategy` changed shape. Fix the spec to the new intended rule, then run the mutant script so the changed rule is shown to fail again.
- **Ties**: D3 and D4 accept any pick among equal scores. If a change starts to need a specific tie-break (for example, list order), that is a new rule to add, not a failure to suppress.

## Scope, bounds, assumptions

- **Covered:** `allocateVAA`, `allocateDAA`, `vaaMessage` and `daaMessage`, called directly with generated summaries. It uses the real `tickersByStrategy` universes and the real `twoDecimalPoint`.
- **Bounded:** this is sampling, not exhaustion. 20,000 generated cases per strategy per run, weighted to zeros and ties. A pass means no counterexample was found in that sample.
- **Assumed:** every momentum score is a finite number. `validPrices` (`src/price/valid-prices.ts`, called by `PriceService.getPrices`) keeps that true: it drops price rows without a finite `adjustedClose` and fails when none remain (see `valid-prices.spec.ts`). Before that guard, a `NaN` score was possible, and it slips past VAA's crash guard because `NaN < 0` is false (checked: offense `SPY = NaN` → VAA buys SPY). This spec still does not generate `NaN`.
- **Not covered:** how scores are computed (`src/strategy/momentum/`; see `month-end.spec.ts` and `score.spec.ts`), Equibles fetching, the Prisma cache, strategy casing (`StrategyService`; see `test/strategy.e2e.spec.ts`), and Telegram delivery. Drive those with the `verify-giants-api` skill.

## Coverage record

Covered files, with the git blob each was last confirmed against (`git hash-object <path>`). The blob stays the marker because the working tree can differ from HEAD.

| Path | Blob confirmed | What is relied on |
| --- | --- | --- |
| `apps/server/src/strategy/allocation/vaa.ts` | `9c9ed723638d621a617346f95676928002a11195` | `allocateVAA` |
| `apps/server/src/strategy/allocation/daa.ts` | `6d70de58a8c4700c5c4741cf95c4528061731ecb` | `allocateDAA` |
| `apps/server/src/strategy/allocation/select.ts` | `f820c9cd6ea21f5d447dff636dc5985fff7f1781` | `findGroup`, `topByScore` |
| `apps/server/src/strategy/report/message.ts` | `583038cfdc5fe28c0be8f324956f2b41db3e9d42` | `vaaMessage`, `daaMessage` lines |
| `apps/server/src/strategy/tickers.ts` | `7d3abd7e3faa2089328ff16d0a3d5c88fb7d2441` | `tickersByStrategy` group names and members |
| `apps/server/src/common/utils/number.ts` | `164f2a7abcba03b1c5ebcdc0b0e064931f6fac66` | `twoDecimalPoint` |
| `apps/server/src/strategy/allocation/allocation.property.spec.ts` | `1f4352c6d45a5e219e49f20651449c4e0cf2b7e8` | the property itself |

Sync point: confirmed 2026-11-10 on HEAD `a4a78e8`, with the spec and all 10 mutants re-run. The covered files last changed in `131c01d`, which regrouped the server by domain (`report.service.ts` split into `allocation/vaa.ts`, `allocation/daa.ts` and `report/message.ts`; group `deffense` renamed `defense`). For that move, the new functions were compared with the old `ReportService` on 10,000 generated score sets: same decisions and the same message text.

Check for drift:

```sh
git hash-object apps/server/src/strategy/allocation/vaa.ts apps/server/src/strategy/allocation/daa.ts apps/server/src/strategy/allocation/select.ts apps/server/src/strategy/report/message.ts apps/server/src/strategy/tickers.ts apps/server/src/common/utils/number.ts apps/server/src/strategy/allocation/allocation.property.spec.ts
```

If a hash differs, read the diff of that file against the rules table. Run the spec and the mutant script. Only after you confirm the rules still describe the code, update the blob (and the HEAD and date on the sync line) in this table. Never update the record just because the tests pass.
