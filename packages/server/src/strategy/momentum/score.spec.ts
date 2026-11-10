import { describe, expect, it } from 'bun:test';
import { scoreTicker } from '#strategy/momentum/score';
import { priceOn, rawPrices, today } from '#test/fixtures/prices';

describe('scoreTicker', () => {
  const { outline, momentumScore } = scoreTicker('SPY', rawPrices, today);

  it('기준 월말을 1·3·6·12개월 전 월말과 비교한다', () => {
    expect(outline.map(({ from, to }) => [from, to])).toEqual([
      ['2026-09-30', '2026-10-30'],
      ['2026-07-31', '2026-10-30'],
      ['2026-04-30', '2026-10-30'],
      ['2025-10-31', '2026-10-30'],
    ]);
  });

  it('배당 조정 종가로 13612W 모멘텀 점수를 계산한다', () => {
    const expected = [
      ['2026-09-30', 12],
      ['2026-07-31', 4],
      ['2026-04-30', 2],
      ['2025-10-31', 1],
    ]
      .map(
        ([date, weight]) =>
          ((priceOn('2026-10-30') / priceOn(date as string)) * 100 - 100) *
          (weight as number),
      )
      .reduce((a, b) => a + b, 0);

    expect(momentumScore).toBeGreaterThan(0);
    // 반올림한 항 4개와 합계 때문에 소수 둘째 자리만 달라질 수 있다
    expect(Math.abs(momentumScore - expected)).toBeLessThanOrEqual(0.025);
  });
});
