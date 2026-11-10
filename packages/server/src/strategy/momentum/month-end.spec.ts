import { describe, expect, it } from 'bun:test';
import { pickMonthEndPrices } from '#strategy/momentum/month-end';
import { rawPrices, today } from '#test/fixtures/prices';

describe('pickMonthEndPrices', () => {
  it('지난달 마지막 거래일과 그 1·3·6·12개월 전 월말을 고른다', () => {
    const dates = pickMonthEndPrices(rawPrices, today).map(({ date }) => date);

    // 2026-10-31은 토요일이라 기준일은 금요일인 2026-10-30이다
    expect(dates).toEqual([
      '2026-10-30',
      '2026-09-30',
      '2026-07-31',
      '2026-04-30',
      '2025-10-31',
    ]);
  });

  it('월말이 휴일이면 그 전 거래일을 고른다', () => {
    const withoutOctober30 = rawPrices.filter(
      ({ date }) => date !== '2026-10-30',
    );

    const [base] = pickMonthEndPrices(withoutOctober30, today);

    expect(base.date).toBe('2026-10-29');
  });
});
