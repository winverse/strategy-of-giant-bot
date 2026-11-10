import { describe, expect, it } from 'bun:test';
import { validPrices } from '#price/valid-prices';

const price = (date: string, adjustedClose: number | null) => ({
  date,
  open: 100,
  high: 100,
  low: 100,
  close: 100,
  adjustedClose: adjustedClose as number,
  volume: 0,
});

describe('validPrices', () => {
  it('배당 조정 종가가 없거나 숫자가 아닌 행은 뺀다', () => {
    const prices = validPrices([
      price('2026-10-30', 683.11),
      price('2026-10-29', null),
      price('2026-10-28', Number.NaN),
      price('2026-10-27', 680.4),
    ]);

    expect(prices.map(({ date }) => date)).toEqual([
      '2026-10-30',
      '2026-10-27',
    ]);
  });

  it('배당 조정 종가가 있는 행이 하나도 없으면 실패한다', () => {
    expect(() => validPrices([price('2026-10-30', null)])).toThrow();
  });
});
