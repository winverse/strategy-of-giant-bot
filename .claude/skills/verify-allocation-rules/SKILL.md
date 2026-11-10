---
name: verify-allocation-rules
description: Check that the VAA and DAA buy decisions in giants-strategy-bot follow the strategy rules for every generated set of momentum scores, not just the hand-picked spec cases. Use before and after any change to packages/server/src/provider/report/report.service.ts, TickersService.getTickersByStrategy, UtilsService.twoDecimalPoint, or the strategy rules in README.md, and whenever the Telegram report's "what to buy" looks wrong.
---

# Verify the VAA/DAA allocation rules

## What is verified, in plain words

**Property.** For any finite momentum scores, the report buys exactly what the README's strategy rules say. VAA buys the single best offense ticker, or the best defense ticker once any offense score is below 0. DAA puts 50% into offense for each canary scoring above 0, splits that equally over the top 6/3/0 offense tickers, and puts the rest into the single best defense ticker. The weights add up to 100%, and the Telegram message prints those same picks.

**Harm if broken.** The bot posts the monthly buy list to Telegram, and the user rebalances real money on it. A wrong comparison (`>=` instead of `>`), a wrong count, or the wrong group silently buys the wrong assets for a month.

## Tool and why

TypeScript has no verifier that runs on the code itself, so this is **property-based testing of the real code**, not a proof. [fast-check](https://fast-check.dev) `4.10.2` (pinned exactly as a dev dependency in `packages/server/package.json`) generates momentum scores and runs the real `ReportService` on each set. The test then checks every decision against the rules above. On a failure, fast-check shrinks the input to a minimal counterexample.

The score generator is biased toward the cases that break this kind of code: exact `0`, ties between tickers, and negatives. It mixes integers in `[-3, 3]` with two-decimal values in `[-300, 300]`. Each ticker gets one score shared across its groups, as in production (DAA's `VWO` is canary and offense, `LQD` is offense and defense). Ticker universes come from the real `TickersService.getTickersByStrategy`.

## Run it

```sh
cd packages/server && bun test src/provider/report/report.allocation.spec.ts
```

It takes about 1 s and runs 20,000 cases per strategy. `ALLOCATION_RUNS=200000` runs a deeper sweep. It also runs as part of plain `bun test`.

## Prove the check can still fail (run after editing the spec or the covered code)

```sh
bun .claude/skills/verify-allocation-rules/scripts/mutants.ts
```

The script first runs the spec on the unmodified code (baseline must pass). Then it applies 10 one-line breaks, one at a time, to a **copy** (`report.service.__mutant__.ts`, deleted afterward) and expects each break to fail the named rule. The real `report.service.ts` is never written. Expected output ends with `all mutants caught`. A `STALE` line means an intended code change moved a mutant's anchor text. Update that mutant's `find`/`replace` in `scripts/mutants.ts` to the new code, keeping the same break.

## Rules and what each one guards

| Rule | Plain statement | Code it guards |
| --- | --- | --- |
| V1 | VAA switches to defense exactly when some offense score is **below** 0 (0 is not negative) | `minusMomentumScoreInOffense` filter, `report.service.ts` |
| V2 | VAA buys from the group V1 chose | `isMinusMomentumScoreInOffense ? deffense : offense` |
| V3 | VAA buys the highest score in that group | `findBestMomentumSocreTicker` |
| V4 | The VAA message names the same group and ticker | the `구매 종목은 … 이며` message line |
| D1 | DAA offense share = 50% × canaries scoring **above** 0; defense share = the rest | `plusMomentumScoreInCanary`, `buyingRatio`, `deffenseRatio` |
| D2 | DAA buys 6 / 3 / 0 distinct offense tickers at 100 / 50 / 0% | `(6 * buyingRatio) / 100` |
| D3 | No unpicked offense ticker outscores a picked one (ties at the cutoff may go either way) | `findBestMomentumScoreTickers` on offense |
| D4 | No defense ticker at 100%; otherwise exactly one, the highest-scoring | `deffenseRatio ? 1 : 0` and the defense call |
| D5 | Printed weights add up to 100%, within ±0.005 per printed line (two-decimal rounding: 6 × 16.67 = 100.02) | `allocations` |
| D6 | Each offense pick gets an equal slice, defense gets the rest, and the message prints each `NAME RATIO%` | `allocations` and the `종목별 매수 금액 비율` line |

## Reading a failure: real bug or modeling error?

A failure prints the rule (`V1:` … `D6:`), a JSON detail with `scores` and the decision, and fast-check's shrunk `Counterexample`. Retell it in code terms, for example: "BND = 0 and VWO = 0, so no canary is positive; `buyingRatio` came out 100, so D1 broke at `plusMomentumScoreInCanary`."

- **Real bug**: the counterexample is a set of finite scores the production pipeline can produce, and the README rule says something different from what the code did. Report it with the counterexample. Do not loosen the rule or the generator to make it pass, and do not change product code unless the user asks.
- **Modeling error**: the spec no longer matches intended behavior. Examples: the strategy rules were deliberately changed (README updated), a group was renamed (`deffense`), the message wording changed, or the universes in `getTickersByStrategy` changed shape. Fix the spec to the new intended rule, then run the mutant script so the changed rule is shown to fail again.
- **Ties**: D3 and D4 accept any pick among equal scores. If a change starts to need a specific tie-break (for example, list order), that is a new rule to add, not a failure to suppress.

## Scope, bounds, assumptions

- **Covered:** `ReportService.createReportForVAAStarategy`, `createReportForDAAStarategy` and their message text, called directly with generated summaries. It uses the real `TickersService.getTickersByStrategy` universes and the real `UtilsService.twoDecimalPoint`.
- **Bounded:** this is sampling, not exhaustion. 20,000 generated cases per strategy per run, weighted to zeros and ties. A pass means no counterexample was found in that sample.
- **Assumed:** every momentum score is a finite number. `FinanceApiService.getHistoricalPrice` keeps that true: it drops price rows without a finite `adjustedClose` and fails when none remain (see `finance-api.service.spec.ts`). Before that guard, a `NaN` score was possible, and it slips past VAA's crash guard because `NaN < 0` is false (checked: offense `SPY = NaN` → VAA buys SPY). This spec still does not generate `NaN`.
- **Not covered:** how scores are computed (`AssetsService` month-end picking and weighting; see `assets.service.spec.ts`), Equibles fetching, the Prisma cache, strategy casing (`AssetsService.toUpperStrategy`), and Telegram delivery. Drive those with the `verify-giants-api` skill.

## Coverage record

Covered files, with the git blob each was last confirmed against (`git hash-object <path>`). HEAD was `8bc3ee3`, and the first three files had uncommitted changes then, so the blob is the reliable marker.

| Path | Blob confirmed | What is relied on |
| --- | --- | --- |
| `packages/server/src/provider/report/report.service.ts` | `7b93ede1e12ba1e80e276f798f17e0b86b525589` | both `createReportFor…` methods, `getMomentumScoreForTickers`, message lines |
| `packages/server/src/module/tickers/tickers.service.ts` | `db97049d3a3e32b2e6b410da5b9856665fa3e21f` | `getTickersByStrategy` group names and members |
| `packages/server/src/provider/utils/utils.service.ts` | `01ca1afe49321c6a422c232e62f19a3a94aa3053` | `twoDecimalPoint` |
| `packages/server/src/provider/report/report.allocation.spec.ts` | `0d173cd1f0b15acad959d7c3224b8124ea8f0671` | the property itself |

Sync point: confirmed 2026-11-10 on HEAD `c33afc9` + working tree (spec text translated to Korean; rule IDs unchanged, spec and all 10 mutants re-run).

Check for drift:

```sh
git hash-object packages/server/src/provider/report/report.service.ts packages/server/src/module/tickers/tickers.service.ts packages/server/src/provider/utils/utils.service.ts packages/server/src/provider/report/report.allocation.spec.ts
```

If a hash differs, read the diff of that file against the rules table. Run the spec and the mutant script. Only after you confirm the rules still describe the code, update the blob (and the HEAD and date on the sync line) in this table. Never update the record just because the tests pass.
