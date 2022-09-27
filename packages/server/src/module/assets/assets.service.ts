import {
  AssetsStrategy,
  SectionalOutline,
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

@Injectable()
export class AssetsService {
  constructor(
    private readonly financeApi: FinanceApiService,
    private readonly utils: UtilsService,
    private readonly tickersService: TickersService,
  ) {}
  private async getRawHistoricalPrices(
    ticker: string,
    today: string,
  ): Promise<RawHistoricalPrice[]> {
    try {
      // Compare today's date and ticker
      // return the DB save value if there is a value in the database.
      const existsTicker = await this.tickersService.findByTicker(ticker, {
        date: today,
      });

      if (existsTicker) return existsTicker.raw as any;

      const tickerData = await this.financeApi.getHistoricalPrice(ticker);

      if (tickerData) {
        await this.tickersService.create({
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
  private getDataBySection(
    rawData?: RawHistoricalPrice[],
  ): RawHistoricalPrice[] {
    try {
      if (!rawData) {
        throw new Error('Failed load raw data from fmp');
      }

      const yesterday = subDays(new Date(), 1);
      // load quarterly data
      const sectionDate = [0, 1, 3, 6, 12].map((section) =>
        subMonths(yesterday, section),
      );

      const rawdataByDate = sectionDate.map((date) => {
        let data = null;
        const amount = 0;
        while (!data) {
          const adjDate = subDays(date, amount);
          const formattedDate = format(adjDate, 'yyyy-MM-dd');
          data = rawData.find((raw) => raw.date === formattedDate);
          // prevent from infinity loop, fmp free price api provider anuual data

          if (!data) {
            return rawData[rawData.length - 1];
          }
        }
        return data;
      });

      return rawdataByDate;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  private sectionalOutline(rawData: RawHistoricalPrice[]): SectionalOutline[] {
    try {
      return rawData.reduce((acc, cur, index, origin) => {
        if (index === 0) return acc;
        const yesterdayOutline = origin[0];

        const returnComparedToYesterday =
          (yesterdayOutline.close / cur.close) * 100 - 100;

        const rateOfRetrun = this.utils.twoDecimalPoint(
          returnComparedToYesterday,
        );

        const adjIndex: Record<number, number> = {
          1: 12,
          2: 4,
          3: 2,
          4: 1,
        };

        const constant = adjIndex[index];

        const outline = {
          to: yesterdayOutline.date,
          from: cur.date,
          rateOfRetrun: `${rateOfRetrun}%`,
          adjMargin: this.utils.twoDecimalPoint(rateOfRetrun * constant), // Momentum을 이용하기 위한 조정 값
        };

        acc.push(outline);
        return acc;
      }, []);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getMomentumScoreByTicker(ticker: string) {
    await this.utils.sleep(200);
    try {
      const today = format(new Date(), 'yy-MM-dd');
      const rawData = await this.getRawHistoricalPrices(ticker, today);
      const rawDataBySection = await this.getDataBySection(rawData);
      const outline = this.sectionalOutline(rawDataBySection);

      const totalMomentumScore = outline
        .map((data) => data.adjMargin)
        .reduce(this.utils.sum);

      return {
        ticker,
        outline,
        totalMomentumScore: this.utils.twoDecimalPoint(totalMomentumScore),
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getMomentumScoreByStretegy(strategy: AssetsStrategy) {
    try {
      if (!['DAA', 'VAA'].includes(strategy)) {
        throw new BadRequestException(BAD_REQUEST);
      }

      const tickersByStrategy =
        this.tickersService.getTickersByStrategy(strategy);

      const tickerByGroup = Object.entries(tickersByStrategy).map(
        ([key, tickers]) => ({ group: key, tickers }),
      );

      return await Promise.all(
        tickerByGroup.flatMap(async ({ group, tickers }) => {
          return {
            group,
            data: await Promise.all(
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
}
