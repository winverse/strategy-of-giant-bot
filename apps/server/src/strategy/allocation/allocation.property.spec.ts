// VAA/DAA 매수 판단의 속성 검사 (.claude/skills/verify-allocation-rules 참고).
// 생성한 모멘텀 점수로 실제 배분 함수와 메시지 함수를 돌리고, 모든 판단을
// README.md의 전략 규칙과 맞춰 본다.
import { describe, it } from 'bun:test';
import fc from 'fast-check';
import type { MomentumScoreSummary } from '#strategy/strategy.types';
import { tickersByStrategy } from '#strategy/tickers';

// 뮤턴트 실행기가 VAA_IMPL·DAA_IMPL·MESSAGE_IMPL로 일부러 망가뜨린 사본을 끼워 넣는다.
const load = (envName: string, path: string) =>
  require(process.env[envName] ?? path);
const { allocateVAA }: typeof import('./vaa') = load('VAA_IMPL', './vaa');
const { allocateDAA }: typeof import('./daa') = load('DAA_IMPL', './daa');
const { vaaMessage, daaMessage }: typeof import('../report/message') = load(
  'MESSAGE_IMPL',
  '../report/message',
);

const NUM_RUNS = Number(process.env.ALLOCATION_RUNS ?? 20000);

const today = new Date(2026, 10, 10, 6);

// 모멘텀 점수는 twoDecimalPoint를 거치므로 소수 둘째 자리까지의
// 유한한 수다. 작은 정수는 동점과 정확한 0을 자주 만든다.
const score = fc.oneof(
  fc.integer({ min: -3, max: 3 }),
  fc.integer({ min: -30000, max: 30000 }).map((n) => n / 100),
);

// 종목마다 점수는 하나다. 두 그룹에 있는 종목(DAA의 VWO, LQD)은
// StrategyService.getMomentumScores에서처럼 양쪽 점수가 같다.
const scoresFor = (strategy: 'VAA' | 'DAA') => {
  const names = [...new Set(Object.values(tickersByStrategy[strategy]).flat())];
  return fc
    .tuple(...names.map(() => score))
    .map((values) => Object.fromEntries(names.map((n, i) => [n, values[i]])));
};

const toSummary = (
  strategy: 'VAA' | 'DAA',
  scores: Record<string, number>,
): MomentumScoreSummary[] =>
  Object.entries(tickersByStrategy[strategy]).map(([group, names]) => ({
    group,
    tickers: names.map((name) => ({
      name,
      momentumScore: scores[name],
      outline: [
        {
          from: '2026-09-30',
          to: '2026-10-30',
          rateOfReturn: 0,
          adjustedReturn: 0,
        },
      ],
    })),
  }));

const groupOf = (strategy: 'VAA' | 'DAA', group: string): string[] =>
  tickersByStrategy[strategy][group];

const max = (values: number[]) => Math.max(...values);

const assertThat = (condition: boolean, rule: string, detail: unknown) => {
  if (!condition) {
    throw new Error(`${rule}\n${JSON.stringify(detail, null, 2)}`);
  }
};

describe('배분 규칙 (속성 검사)', () => {
  it('VAA는 공격 자산 중 최고 점수를 사고, 공격 자산 하나라도 마이너스면 안전 자산 중 최고 점수를 산다', () => {
    fc.assert(
      fc.property(scoresFor('VAA'), (scores) => {
        const offense = groupOf('VAA', 'offense');
        const defense = groupOf('VAA', 'defense');
        const summary = toSummary('VAA', scores);
        const vaa = allocateVAA(summary);
        const message = vaaMessage(summary, vaa, today);
        const picked = vaa.selectedTicker;

        const anyNegative = offense.some((name) => scores[name] < 0);
        const pool = anyNegative ? defense : offense;
        const detail = { scores, anyNegative, picked: picked?.name };

        assertThat(
          vaa.isDefensive === anyNegative,
          'V1: 공격 자산 점수가 0 미만일 때만 안전 자산으로 바꾼다',
          detail,
        );
        assertThat(
          pool.includes(picked.name),
          'V2: V1이 고른 그룹에서 산다',
          detail,
        );
        assertThat(
          scores[picked.name] === max(pool.map((name) => scores[name])),
          'V3: 그 그룹에서 모멘텀 점수가 가장 높은 종목을 산다',
          detail,
        );
        assertThat(
          message.includes(
            `${anyNegative ? '안전' : '공격'}자산 중 구매 종목은 ${picked.name} 이며`,
          ),
          'V4: 텔레그램 메시지에 같은 종목과 그룹이 나온다',
          detail,
        );
      }),
      { numRuns: NUM_RUNS, includeErrorInReport: true },
    );
  });

  it('DAA는 카나리아로 공격 비중을 정해 공격 자산 상위 종목을 사고, 나머지는 최고 점수 안전 자산에 넣는다', () => {
    fc.assert(
      fc.property(scoresFor('DAA'), (scores) => {
        const canary = groupOf('DAA', 'canary');
        const offense = groupOf('DAA', 'offense');
        const defense = groupOf('DAA', 'defense');
        const summary = toSummary('DAA', scores);
        const daa = allocateDAA(summary);
        const message = daaMessage(summary, daa, today);

        const positiveCanaries = canary.filter((n) => scores[n] > 0).length;
        const offenseShare = [0, 50, 100][positiveCanaries];
        const offenseCount = [0, 3, 6][positiveCanaries];
        const picked = daa.offenseTickers;
        const unpicked = offense.filter((n) => !picked.includes(n));
        const detail = { scores, positiveCanaries, daa };

        assertThat(
          daa.offenseRatio === offenseShare &&
            daa.defenseRatio === 100 - offenseShare,
          'D1: 점수가 0보다 큰 카나리아 하나마다 공격 비중이 50%다',
          detail,
        );
        assertThat(
          picked.length === offenseCount &&
            new Set(picked).size === picked.length &&
            picked.every((n) => offense.includes(n)),
          'D2: 공격 비중 100%, 50%, 0%에 서로 다른 공격 자산을 6, 3, 0개 산다',
          detail,
        );
        assertThat(
          picked.every((p) => unpicked.every((u) => scores[p] >= scores[u])),
          'D3: 고르지 않은 공격 자산이 고른 것보다 점수가 높지 않다',
          detail,
        );
        const defensePick = daa.defenseTickers;
        assertThat(
          offenseShare === 100
            ? defensePick.length === 0
            : defensePick.length === 1 &&
                scores[defensePick[0]] ===
                  max(defense.map((name) => scores[name])),
          'D4: 남은 비중은 최고 점수 안전 자산 하나에 간다',
          detail,
        );

        const allocations = daa.allocations;
        const total = allocations.reduce((sum, a) => sum + a.ratio, 0);
        assertThat(
          Math.abs(total - 100) <= 0.005 * allocations.length + 1e-9,
          'D5: 출력한 비중의 합이 100%다 (소수 둘째 자리 반올림 오차 허용)',
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
          'D6: 공격 자산은 같은 비중, 안전 자산은 나머지를 받고 메시지에 그대로 나온다',
          detail,
        );
      }),
      { numRuns: NUM_RUNS, includeErrorInReport: true },
    );
  });
});
