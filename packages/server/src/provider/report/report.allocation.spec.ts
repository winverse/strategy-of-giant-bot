// Property check for the VAA/DAA buy decision (see .claude/skills/verify-allocation-rules).
// Runs the real ReportService on generated momentum scores and checks every
// decision against the strategy rules in README.md.
import { describe, it } from 'bun:test';
import fc from 'fast-check';
import { MomentumScoreSummary } from '#module/assets/assets.interface';
import { TickersService } from '#module/tickers/tickers.service';
import { UtilsService } from '#provider/utils/utils.service';

// ALLOCATION_IMPL lets the mutant runner swap in a broken copy of report.service.ts.
const { ReportService }: typeof import('./report.service') = require(
  process.env.ALLOCATION_IMPL ?? './report.service',
);

const NUM_RUNS = Number(process.env.ALLOCATION_RUNS ?? 20000);

const tickersService = new TickersService({} as any);
const reportService = new ReportService(new UtilsService(), tickersService);

// Momentum scores come out of UtilsService.twoDecimalPoint, so they are finite
// numbers with two decimals. Small integers force ties and exact zeros.
const score = fc.oneof(
  fc.integer({ min: -3, max: 3 }),
  fc.integer({ min: -30000, max: 30000 }).map((n) => n / 100),
);

// One score per ticker name: a ticker in two groups (DAA's VWO, LQD) has the
// same score in both, as it does in AssetsService.getMomentumScoreByStretegy.
const scoresFor = (strategy: 'VAA' | 'DAA') => {
  const groups = tickersService.getTickersByStrategy(strategy);
  const names = [...new Set(Object.values(groups).flat())];
  return fc
    .tuple(...names.map(() => score))
    .map((values) => Object.fromEntries(names.map((n, i) => [n, values[i]])));
};

const toSummary = (
  strategy: 'VAA' | 'DAA',
  scores: Record<string, number>,
): MomentumScoreSummary[] =>
  Object.entries(tickersService.getTickersByStrategy(strategy)).map(
    ([group, names]) => ({
      group,
      tickers: names.map((name) => ({
        name,
        momentumScore: scores[name],
        outline: [
          {
            from: '2026-09-30',
            to: '2026-10-30',
            rateOfRetrun: 0,
            adjustedReturn: 0,
          },
        ],
      })),
    }),
  );

const groupOf = (strategy: 'VAA' | 'DAA', group: string) =>
  tickersService.getTickersByStrategy(strategy)[group];

const max = (values: number[]) => Math.max(...values);

const assertThat = (condition: boolean, rule: string, detail: unknown) => {
  if (!condition) {
    throw new Error(`${rule}\n${JSON.stringify(detail, null, 2)}`);
  }
};

describe('allocation rules (property)', () => {
  it('VAA buys the best offense ticker, or the best defense ticker once any offense score is negative', () => {
    fc.assert(
      fc.property(scoresFor('VAA'), (scores) => {
        const offense = groupOf('VAA', 'offense');
        const defense = groupOf('VAA', 'deffense');
        const { meta, message } = reportService.createReportForVAAStarategy(
          toSummary('VAA', scores),
        );
        const picked = meta.selectedTickerData;

        const anyNegative = offense.some((name) => scores[name] < 0);
        const pool = anyNegative ? defense : offense;
        const detail = { scores, anyNegative, picked: picked?.name };

        assertThat(
          meta.isMinusMomentumScoreInOffense === anyNegative,
          'V1: switches to defense exactly when an offense score is below 0',
          detail,
        );
        assertThat(
          pool.includes(picked.name),
          'V2: buys from the group that V1 chooses',
          detail,
        );
        assertThat(
          scores[picked.name] === max(pool.map((name) => scores[name])),
          'V3: buys the highest momentum score in that group',
          detail,
        );
        assertThat(
          message.includes(
            `${anyNegative ? '안전' : '공격'}자산 중 구매 종목은 ${picked.name} 이며`,
          ),
          'V4: the Telegram message names the same ticker and group',
          detail,
        );
      }),
      { numRuns: NUM_RUNS, includeErrorInReport: true },
    );
  });

  it('DAA sizes offense by canaries, buys the top offense tickers, and puts the rest in the best defense ticker', () => {
    fc.assert(
      fc.property(scoresFor('DAA'), (scores) => {
        const canary = groupOf('DAA', 'canary');
        const offense = groupOf('DAA', 'offense');
        const defense = groupOf('DAA', 'deffense');
        const { meta, message } = reportService.createReportForDAAStarategy(
          toSummary('DAA', scores),
        );

        const positiveCanaries = canary.filter((n) => scores[n] > 0).length;
        const offenseShare = [0, 50, 100][positiveCanaries];
        const offenseCount = [0, 3, 6][positiveCanaries];
        const picked: string[] = meta.highScoreTickers;
        const unpicked = offense.filter((n) => !picked.includes(n));
        const detail = { scores, positiveCanaries, meta };

        assertThat(
          meta.buyingRatio === offenseShare &&
            meta.deffenseRatio === 100 - offenseShare,
          'D1: offense share is 50% per canary with a score above 0',
          detail,
        );
        assertThat(
          picked.length === offenseCount &&
            new Set(picked).size === picked.length &&
            picked.every((n) => offense.includes(n)),
          'D2: buys 6, 3 or 0 distinct offense tickers for 100%, 50%, 0%',
          detail,
        );
        assertThat(
          picked.every((p) => unpicked.every((u) => scores[p] >= scores[u])),
          'D3: no unpicked offense ticker outscores a picked one',
          detail,
        );
        const defensePick: string[] = meta.deffenseTickers;
        assertThat(
          offenseShare === 100
            ? defensePick.length === 0
            : defensePick.length === 1 &&
                scores[defensePick[0]] ===
                  max(defense.map((name) => scores[name])),
          'D4: the remaining share goes to the single best defense ticker',
          detail,
        );

        const allocations: { name: string; ratio: number }[] = meta.allocations;
        const total = allocations.reduce((sum, a) => sum + a.ratio, 0);
        assertThat(
          Math.abs(total - 100) <= 0.005 * allocations.length + 1e-9,
          'D5: the printed weights add up to 100% (up to two-decimal rounding)',
          { ...detail, total },
        );
        assertThat(
          allocations.every(
            (a, i) =>
              (i < picked.length
                ? a.name === picked[i] &&
                  Math.abs(a.ratio - offenseShare / picked.length) <= 0.005
                : a.name === defensePick[0] &&
                  a.ratio === 100 - offenseShare) &&
              message.includes(`${a.name} ${a.ratio}%`),
          ) && allocations.length === picked.length + defensePick.length,
          'D6: each offense pick gets an equal slice, defense gets the rest, and the message prints them',
          detail,
        );
      }),
      { numRuns: NUM_RUNS, includeErrorInReport: true },
    );
  });
});
