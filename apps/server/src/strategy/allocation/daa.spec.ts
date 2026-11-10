import { describe, expect, it } from 'bun:test';
import { allocateDAA } from '#strategy/allocation/daa';
import { summaryOf } from '#test/fixtures/summary';

const offense = {
  SPY: 18.2,
  IWM: 7.5,
  QQQ: -60.5,
  VGK: 14.2,
  EWJ: -28,
  VWO: -106,
  VNQ: 48.5,
  GSG: 185.9,
  GLD: -131.3,
  TLT: 61,
  HYG: 4.3,
  LQD: 21.9,
};
const defense = { SHY: 16.8, IEF: 31.9, LQD: 21.9 };

describe('allocateDAA', () => {
  it.each([
    [
      '카나리아 둘 다 플러스: 공격 자산 상위 6개, 안전 자산 없음',
      { BND: 27.6, VWO: 1.5 },
      {
        offenseRatio: 100,
        offenseTickers: ['GSG', 'TLT', 'VNQ', 'LQD', 'SPY', 'VGK'],
        defenseTickers: [],
      },
    ],
    [
      '카나리아 하나만 플러스: 공격 자산 상위 3개와 최고 점수 안전 자산',
      { BND: 27.6, VWO: -106 },
      {
        offenseRatio: 50,
        offenseTickers: ['GSG', 'TLT', 'VNQ'],
        defenseTickers: ['IEF'],
      },
    ],
    [
      '플러스인 카나리아 없음: 최고 점수 안전 자산만',
      { BND: -3.1, VWO: -106 },
      {
        offenseRatio: 0,
        offenseTickers: [],
        defenseTickers: ['IEF'],
      },
    ],
  ])('%s', (_, canary, expected) => {
    const daa = allocateDAA(summaryOf({ canary, offense, defense }));

    expect({
      offenseRatio: daa.offenseRatio,
      offenseTickers: daa.offenseTickers,
      defenseTickers: daa.defenseTickers,
    }).toEqual(expected);

    const totalRatio = daa.allocations
      .map(({ ratio }) => ratio)
      .reduce((a, b) => a + b, 0);
    expect(totalRatio).toBeCloseTo(100, 1);
  });

  it('공격 비중을 고른 종목 수로 똑같이 나눈다', () => {
    const { allocations } = allocateDAA(
      summaryOf({ canary: { BND: 27.6, VWO: -106 }, offense, defense }),
    );

    expect(allocations).toEqual([
      { name: 'GSG', ratio: 16.67 },
      { name: 'TLT', ratio: 16.67 },
      { name: 'VNQ', ratio: 16.67 },
      { name: 'IEF', ratio: 50 },
    ]);
  });
});
