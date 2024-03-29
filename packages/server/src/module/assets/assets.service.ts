import { ReportService } from '@provider/report/report.service';
import { TickerSummary } from './assets.interface';
import {
  AssetsStrategy,
  MomentumScoreSummary,
  QuarterlyOutline,
} from '@module/assets/assets.interface';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FinanceApiService } from '@provider/finance-api';
import { RawHistoricalPrice } from '@provider/finance-api/finance-api.interface';
import { TickersService } from '@module/tickers/tickers.service';
import { UtilsService } from '@provider/utils';
import { subDays, format, subMonths } from 'date-fns';
import { BAD_REQUEST } from 'src/constants/errors/errors.contants';
import { MomentumScoreReportResult } from '@provider/report/report.interface';

@Injectable()
export class AssetsService {
  constructor(
    private readonly financeApi: FinanceApiService,
    private readonly tickersService: TickersService,
    private readonly reportService: ReportService,
    private readonly utils: UtilsService,
  ) {}
  private async getRawHistoricalPrices(
    ticker: string,
    today: string,
  ): Promise<RawHistoricalPrice[]> {
    try {
      const existsTicker = await this.tickersService.findByTicker(ticker, {
        date: today,
      });

      if (existsTicker) return existsTicker.raw as any;

      const tickerData = await this.utils.retry(5, () =>
        this.financeApi.getHistoricalPrice(ticker),
      );

      if (tickerData) {
        await this.tickersService.createTicker({
          date: today,
          ticker,
          raw: tickerData as any,
        });
      }

      return tickerData;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  private pickUpRawDataByQuarterly(
    rawData?: RawHistoricalPrice[],
  ): RawHistoricalPrice[] {
    try {
      if (!rawData) {
        throw new Error('Failed load raw data from fmp');
      }

      const yesterday = subDays(new Date(), 1);
      const quarterlyBaseDate = {
        now: 0,
        monthAgo: 1,
        threeMonthsAgo: 3,
        sixMonthsAgo: 6,
        yearAgo: 12,
      } as const;

      return Object.values(quarterlyBaseDate)
        .map((quarter) => subMonths(yesterday, quarter))
        .map((date) => {
          let data: RawHistoricalPrice | undefined = undefined;
          let diff = 0;
          // Find data considering closed days
          while (!data) {
            const adjDate = subDays(date, diff);
            const formattedDate = format(adjDate, 'yyyy-MM-dd');
            data = rawData.find((raw) => raw.date === formattedDate);
            if (diff > 10) {
              return rawData[rawData.length - 1];
            }

            if (!data) {
              diff++;
            }
          }
          return data;
        });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  private quarterlyOutline(rawData: RawHistoricalPrice[]): QuarterlyOutline[] {
    try {
      return rawData.reduce<QuarterlyOutline[]>(
        (outlines, raw, index, origin) => {
          if (index === 0) return outlines;
          const yesterdayOverview = origin[0];

          const returnComparedWithYesterday =
            (yesterdayOverview.close / raw.close) * 100 - 100;

          const rateOfRetrun = this.utils.twoDecimalPoint(
            returnComparedWithYesterday,
          );

          const quarterlyWeightedValues = {
            monthAgo: 12,
            threeMonthsAgo: 4,
            sixMonthsAgo: 2,
            yearAgo: 1,
          } as const;

          const weightedValues = Object.values(quarterlyWeightedValues);
          const weightedValue = weightedValues[index - 1];

          const outline = {
            from: raw.date,
            to: yesterdayOverview.date,
            rateOfRetrun,
            adjustedReturn: this.utils.twoDecimalPoint(
              rateOfRetrun * weightedValue,
            ), // Adjustment value to take advantage of Momentum
          };

          return outlines.concat(outline);
        },
        [],
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getMomentumScoreByTicker(ticker: string): Promise<TickerSummary> {
    try {
      const today = this.utils.today();
      const rawData = await this.getRawHistoricalPrices(ticker, today);
      const rawDataBySection = await this.pickUpRawDataByQuarterly(rawData);
      const outline = this.quarterlyOutline(rawDataBySection);

      const momentumScore = outline
        .map((data) => data.adjustedReturn)
        .reduce(this.utils.sum);

      return {
        name: ticker,
        outline,
        momentumScore: this.utils.twoDecimalPoint(momentumScore),
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getMomentumScoreByStretegy(
    strategy: AssetsStrategy,
  ): Promise<MomentumScoreSummary[]> {
    try {
      const upperStrategy = strategy.toUpperCase() as AssetsStrategy;
      if (!['DAA', 'VAA'].includes(upperStrategy)) {
        throw new BadRequestException(BAD_REQUEST);
      }

      const tickersByStrategy =
        this.tickersService.getTickersByStrategy(upperStrategy);

      const tickerByGroup = Object.entries(tickersByStrategy).map(
        ([key, tickers]) => ({ group: key, tickers }),
      );

      return await Promise.all(
        tickerByGroup.flatMap(async ({ group, tickers }) => {
          return {
            group,
            tickers: await Promise.all(
              tickers.map(
                async (ticker) => await this.getMomentumScoreByTicker(ticker),
              ),
            ),
          };
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async printReportMessage(
    strategy: AssetsStrategy,
    summary: MomentumScoreSummary[],
  ) {
    try {
      const messageTable: Record<AssetsStrategy, any> = {
        DAA: () => this.reportService.createReportForDAAStarategy(summary),
        VAA: () => this.reportService.createReportForVAAStarategy(summary),
      };

      const result: MomentumScoreReportResult = messageTable[strategy]();

      return result.message;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
