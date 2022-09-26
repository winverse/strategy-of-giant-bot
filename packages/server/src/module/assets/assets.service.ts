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
import { PrismaService } from '@provider/prisma';
import { TickerService } from '@provider/ticker/ticker.service';
import { UtilsService } from '@provider/utils';
import { subDays, format, subMonths } from 'date-fns';
import { BAD_REQUEST } from 'src/constants/errors/errors.contants';
@Injectable()
export class AssetsService {
  constructor(
    private readonly financeApi: FinanceApiService,
    private readonly utils: UtilsService,
    private readonly prisma: PrismaService,
    private readonly tickerService: TickerService,
  ) {}
  private async getRawHistoricalPrices(
    ticker: string,
  ): Promise<RawHistoricalPrice[]> {
    try {
      // Compare today's date and ticker
      // return the DB save value if there is a value in the database.

      const today = format(new Date(), 'yy-MM-dd');

      const exists = await this.prisma.rawData.findFirst({
        where: {
          date: today,
          ticker,
        },
      });

      if (exists) return exists.raw as any;

      const rawData = await this.financeApi.getHistoricalPrice(ticker);

      if (rawData) {
        await this.prisma.rawData.create({
          data: {
            date: today,
            ticker,
            raw: rawData as any,
          },
        });
      }

      return rawData;
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
        let amount = 0;
        while (!data) {
          const adjDate = subDays(date, amount);
          const formattedDate = format(adjDate, 'yyyy-MM-dd');
          data = rawData.find((raw) => raw.date === formattedDate);
          // prevent from infinity loop, fmp free price api provider anuual data
          if (amount > 10) {
            return rawData[rawData.length - 1];
          }
          if (!data) {
            amount++;
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

        const rateOfRetrun = Number(returnComparedToYesterday.toFixed(2));
        const adjIndex = {
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
          adjMargin: Number((rateOfRetrun * constant).toFixed(2)),
        };

        acc.push(outline);
        return acc;
      }, []);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getMomentunScoreByTicker(ticker: string) {
    try {
      const rawData = await this.getRawHistoricalPrices(ticker);

      const rawDataBySection = await this.getDataBySection(rawData);

      const outline = this.sectionalOutline(rawDataBySection);

      const totalMomentumScore: number = outline.reduce(
        (acc, cur) => acc + cur.adjMargin,
        0,
      );

      return {
        ticker,
        outline,
        totalMomentumScore: Number(totalMomentumScore.toFixed(2)),
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getmomentumScoreByStretegy(strategy: AssetsStrategy) {
    try {
      if (!['DAA', 'VAA'].includes(strategy)) {
        throw new BadRequestException(BAD_REQUEST);
      }

      const tickersByStrategy =
        this.tickerService.getTickersByStrategy(strategy);

      const result = await Promise.all(
        Object.entries(tickersByStrategy).map(async ([key, tickers]) => {
          const data = [];
          for (const ticker of tickers) {
            await this.utils.sleep(700);
            const outline = await this.getMomentunScoreByTicker(ticker);
            data.push(outline);
          }

          return {
            group: key,
            data,
          };
        }),
      );

      return result;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
