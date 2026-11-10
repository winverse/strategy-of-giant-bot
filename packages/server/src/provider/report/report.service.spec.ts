import { describe, expect, it } from 'bun:test';
import { MomentumScoreSummary } from '#module/assets/assets.interface';
import { TickersService } from '#module/tickers/tickers.service';
import { UtilsService } from '#provider/utils/utils.service';
import { ReportService } from '#provider/report/report.service';

const createSummary = (
  scoresByGroup: Record<string, Record<string, number>>,
): MomentumScoreSummary[] =>
  Object.entries(scoresByGroup).map(([group, scores]) => ({
    group,
    tickers: Object.entries(scores).map(([name, momentumScore]) => ({
      name,
      momentumScore,
      outline: [
        {
          from: '2026-09-30',
          to: '2026-10-30',
          rateOfRetrun: 0,
          adjustedReturn: 0,
        },
      ],
    })),
  }));

const reportService = new ReportService(
  new UtilsService(),
  new TickersService({} as any),
);

describe('ReportService', () => {
  describe('createReportForVAAStarategy', () => {
    const deffense = { SHY: 16.8, IEF: 31.9, LQD: -21.9 };

    it.each([
      [
        'buys the best offense ticker when every offense score is plus',
        { SPY: 18.2, VEA: 5.3, VWO: 1.2, AGG: 25.7 },
        'AGG',
      ],
      [
        'buys the best deffense ticker when any offense score is minus',
        { SPY: 18.2, VEA: -5.3, VWO: 1.2, AGG: 25.7 },
        'IEF',
      ],
    ])('%s', (_, offense, expected) => {
      const { meta } = reportService.createReportForVAAStarategy(
        createSummary({ offense, deffense }),
      );

      expect(meta.selectedTickerData.name).toBe(expected);
    });
  });

  describe('createReportForDAAStarategy', () => {
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
    const deffense = { SHY: 16.8, IEF: 31.9, LQD: 21.9 };

    it.each([
      [
        'both canary scores are plus: top 6 offense tickers, no deffense',
        { BND: 27.6, VWO: 1.5 },
        {
          buyingRatio: 100,
          highScoreTickers: ['GSG', 'TLT', 'VNQ', 'LQD', 'SPY', 'VGK'],
          deffenseTickers: [],
        },
      ],
      [
        'one canary score is plus: top 3 offense tickers and the best deffense ticker',
        { BND: 27.6, VWO: -106 },
        {
          buyingRatio: 50,
          highScoreTickers: ['GSG', 'TLT', 'VNQ'],
          deffenseTickers: ['IEF'],
        },
      ],
      [
        'no canary score is plus: only the best deffense ticker',
        { BND: -3.1, VWO: -106 },
        {
          buyingRatio: 0,
          highScoreTickers: [],
          deffenseTickers: ['IEF'],
        },
      ],
    ])('%s', (_, canary, expected) => {
      const { meta } = reportService.createReportForDAAStarategy(
        createSummary({ canary, offense, deffense }),
      );

      expect({
        buyingRatio: meta.buyingRatio,
        highScoreTickers: meta.highScoreTickers,
        deffenseTickers: meta.deffenseTickers,
      }).toEqual(expected);

      const totalRatio = meta.allocations
        .map(({ ratio }) => ratio)
        .reduce((a, b) => a + b, 0);
      expect(totalRatio).toBeCloseTo(100, 1);
    });

    it('splits the buying ratio equally and writes the base date', () => {
      const { meta, message } = reportService.createReportForDAAStarategy(
        createSummary({ canary: { BND: 27.6, VWO: -106 }, offense, deffense }),
      );

      expect(meta.allocations).toEqual([
        { name: 'GSG', ratio: 16.67 },
        { name: 'TLT', ratio: 16.67 },
        { name: 'VNQ', ratio: 16.67 },
        { name: 'IEF', ratio: 50 },
      ]);
      expect(message).toContain('기준일: 2026-10-30 (월말 종가)');
    });
  });
});
