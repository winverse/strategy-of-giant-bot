import { tickerListByStrategy } from '@common/helper/ticker-list-by-starategy';
import {
  AssetsStrategy,
  SectionalOutline,
} from '@module/assets/assets.interface';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FinanceApiService } from '@provider/finance-api';
import { RawHistoricalPrice } from '@provider/finance-api/finance-api.interface';
import { UtilsService } from '@provider/utils';
import { subDays, format, subMonths } from 'date-fns';
import { BAD_REQUEST } from 'src/constants/errors/errors.contants';
@Injectable()
export class AssetsService {
  constructor(
    private financeApi: FinanceApiService,
    private utils: UtilsService,
  ) {}
  private async getRawHistoricalPrices(
    ticker: string,
  ): Promise<RawHistoricalPrice[]> {
    // Compare today's date and ticker
    // return the DB save value if there is a value in the database.

    const rawData = await this.financeApi.getHistoricalPrice(ticker);
    return rawData;
  }
  private getDataBySection(
    rawData: RawHistoricalPrice[],
  ): RawHistoricalPrice[] {
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
  }
  private sectionalOutline(rawData: RawHistoricalPrice[]): SectionalOutline[] {
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
  }
  async getMomentunScoreByTicker(ticker: string) {
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
  }
  async getmomentumScoreByStretegy(strategy: AssetsStrategy) {
    if (!['DAA', 'VAA'].includes(strategy)) {
      throw new BadRequestException(BAD_REQUEST);
    }

    const tickersByStrategy = tickerListByStrategy(strategy);

    const result = await Promise.all(
      Object.entries(tickersByStrategy).map(async ([key, tickers]) => {
        const data = [];
        for (const ticker of tickers) {
          await this.utils.sleep(800);
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
  }
}
