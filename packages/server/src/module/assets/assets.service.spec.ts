import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setSystemTime,
} from 'bun:test';
import { eachDayOfInterval, format, isWeekend } from 'date-fns';
import { AssetsService } from '#module/assets/assets.service';
import { TickersService } from '#module/tickers/tickers.service';
import { ReportService } from '#provider/report/report.service';
import { UtilsService } from '#provider/utils/utils.service';
import { RawHistoricalPrice } from '#provider/finance-api/finance-api.interface';

// Weekdays only, newest first like the Equibles API.
// close never changes, so only adjustedClose can make a momentum score.
const rawData: RawHistoricalPrice[] = eachDayOfInterval({
  start: new Date(2025, 8, 1),
  end: new Date(2026, 10, 9),
})
  .filter((date) => !isWeekend(date))
  .map((date, index) => ({
    date: format(date, 'yyyy-MM-dd'),
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    adjustedClose: 100 + index,
    volume: 0,
  }))
  .reverse();

const priceOf = (date: string) =>
  rawData.find((raw) => raw.date === date)?.adjustedClose ?? NaN;

const createAssetsService = () => {
  const utils = new UtilsService();
  const prisma = {
    tickers: {
      findFirst: async () => null,
      create: async ({ data }: any) => data,
    },
  };
  const tickersService = new TickersService(prisma as any);
  const financeApi = { getHistoricalPrice: async () => rawData };

  return new AssetsService(
    financeApi as any,
    tickersService,
    new ReportService(utils, tickersService),
    utils,
  );
};

describe('AssetsService', () => {
  beforeAll(() => setSystemTime(new Date('2026-11-10T06:00:00+09:00')));
  afterAll(() => setSystemTime());

  it('compares the last trading day of last month with month-ends before it', async () => {
    const { outline } =
      await createAssetsService().getMomentumScoreByTicker('SPY');

    // 2026-10-31 is Saturday, so the base date is Friday 2026-10-30
    expect(outline.map(({ from, to }) => [from, to])).toEqual([
      ['2026-09-30', '2026-10-30'],
      ['2026-07-31', '2026-10-30'],
      ['2026-04-30', '2026-10-30'],
      ['2025-10-31', '2026-10-30'],
    ]);
  });

  it('calculates the momentum score with adjusted close', async () => {
    const { momentumScore } =
      await createAssetsService().getMomentumScoreByTicker('SPY');

    const expected = [
      ['2026-09-30', 12],
      ['2026-07-31', 4],
      ['2026-04-30', 2],
      ['2025-10-31', 1],
    ]
      .map(
        ([date, weight]) =>
          ((priceOf('2026-10-30') / priceOf(date as string)) * 100 - 100) *
          (weight as number),
      )
      .reduce((a, b) => a + b, 0);

    expect(momentumScore).toBeGreaterThan(0);
    expect(momentumScore).toBeCloseTo(expected, 0);
  });
});
