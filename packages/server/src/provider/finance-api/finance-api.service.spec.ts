import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import axios from 'axios';
import { FinanceApiService } from '#provider/finance-api/finance-api.service';

const price = (date: string, adjustedClose: number | null) => ({
  date,
  open: 100,
  high: 100,
  low: 100,
  close: 100,
  adjustedClose,
  volume: 0,
});

// axios 클라이언트 대역: 모든 요청에 이 행들을 돌려준다
const mockPrices = (rows: ReturnType<typeof price>[]) =>
  spyOn(axios, 'create').mockReturnValue({
    interceptors: { request: { use: () => 0 } },
    get: async () => ({ data: { ticker: 'SPY', data: rows } }),
  } as any);

const financeApi = new FinanceApiService({ get: () => 'eq_test' } as any);

describe('FinanceApiService', () => {
  afterEach(() => {
    (axios.create as any).mockRestore?.();
  });

  it('배당 조정 종가가 없거나 숫자가 아닌 행은 뺀다', async () => {
    mockPrices([
      price('2026-10-30', 683.11),
      price('2026-10-29', null),
      price('2026-10-28', Number.NaN),
      price('2026-10-27', 680.4),
    ]);

    const rows = await financeApi.getHistoricalPrice('SPY');

    expect(rows.map(({ date }) => date)).toEqual(['2026-10-30', '2026-10-27']);
  });

  it('배당 조정 종가가 있는 행이 하나도 없으면 실패한다', async () => {
    mockPrices([price('2026-10-30', null)]);

    await expect(financeApi.getHistoricalPrice('SPY')).rejects.toThrow();
  });
});
