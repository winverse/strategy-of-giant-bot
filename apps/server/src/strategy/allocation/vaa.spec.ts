import { describe, expect, it } from 'bun:test';
import { allocateVAA } from '#strategy/allocation/vaa';
import { summaryOf } from '#test/fixtures/summary';

describe('allocateVAA', () => {
  const defense = { SHY: 16.8, IEF: 31.9, LQD: -21.9 };

  it.each([
    [
      '공격 자산 점수가 모두 플러스면 공격 자산 중 최고 점수를 산다',
      { SPY: 18.2, VEA: 5.3, VWO: 1.2, AGG: 25.7 },
      'AGG',
    ],
    [
      '공격 자산 중 하나라도 마이너스면 안전 자산 중 최고 점수를 산다',
      { SPY: 18.2, VEA: -5.3, VWO: 1.2, AGG: 25.7 },
      'IEF',
    ],
    [
      '점수가 0인 공격 자산은 마이너스로 보지 않는다',
      { SPY: 18.2, VEA: 0, VWO: 1.2, AGG: 25.7 },
      'AGG',
    ],
  ])('%s', (_, offense, expected) => {
    const { selectedTicker } = allocateVAA(summaryOf({ offense, defense }));

    expect(selectedTicker.name).toBe(expected);
  });
});
