import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  setSystemTime,
} from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { eachDayOfInterval, format, isWeekend } from 'date-fns';
import { AssetsService } from '#module/assets/assets.service';
import { TickersService } from '#module/tickers/tickers.service';
import { ReportService } from '#provider/report/report.service';
import { UtilsService } from '#provider/utils/utils.service';
import { RawHistoricalPrice } from '#provider/finance-api/finance-api.interface';

// Equibles API처럼 평일만, 최신 날짜가 먼저 온다.
// close는 늘 같아서 모멘텀 점수는 adjustedClose로만 생긴다.
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

  it('지난달 마지막 거래일을 그 전 달들의 월말과 비교한다', async () => {
    const { outline } =
      await createAssetsService().getMomentumScoreByTicker('SPY');

    // 2026-10-31은 토요일이라 기준일은 금요일인 2026-10-30이다
    expect(outline.map(({ from, to }) => [from, to])).toEqual([
      ['2026-09-30', '2026-10-30'],
      ['2026-07-31', '2026-10-30'],
      ['2026-04-30', '2026-10-30'],
      ['2025-10-31', '2026-10-30'],
    ]);
  });

  it('배당 조정 종가로 모멘텀 점수를 계산한다', async () => {
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
    // 반올림한 항 4개와 합계 때문에 소수 둘째 자리만 달라질 수 있다
    expect(Math.abs(momentumScore - expected)).toBeLessThanOrEqual(0.025);
  });

  it.each(['vaa', 'VAA', 'daa'])(
    '전략 이름 %s로 리포트를 만든다 (대소문자 무관)',
    async (strategy) => {
      const assets = createAssetsService();
      const summary = await assets.getMomentumScoreByStretegy(strategy as any);
      const message = await assets.printReportMessage(strategy as any, summary);

      expect(message).toStartWith(`[${strategy.toUpperCase()} Strategy]`);
    },
  );

  it.each([undefined, '', 'GTAA'])(
    '전략 %p는 잘못된 요청(400)으로 거절한다',
    async (strategy) => {
      await expect(
        createAssetsService().getMomentumScoreByStretegy(strategy as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
