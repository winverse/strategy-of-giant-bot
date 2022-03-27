import { tickerListByStrategy } from '@common/helper/ticker-list-by-starategy';
import { AssetsStrategy } from '@module/assets/assets.interface';
import { Injectable } from '@nestjs/common';
import { FinanceApiService } from '@provider/finance-api';
import { RawHistoricalPrice } from '@provider/finance-api/finance-api.interface';
import { subDays, format, subMonths } from 'date-fns';
@Injectable()
export class AssetsService {
  constructor(private financeApi: FinanceApiService) {}
  private async getRawHistoricalPrices(
    ticker: string,
  ): Promise<RawHistoricalPrice[]> {
    // 오늘 날짜와 ticker 비교해서 데이터베이스에 값이 있으면 디비 저장 값 리턴
    const rawData = await this.financeApi.getHistoricalPrice(ticker);
    return rawData;
  }
  private getDataBySection(
    rawData: RawHistoricalPrice[],
  ): RawHistoricalPrice[] {
    const yesterday = subDays(new Date(), 1);
    const sectionDate = [1, 3, 6, 12].map((section) => {
      const date = subMonths(yesterday, section);
      return date;
    });

    const rawdataByDate = sectionDate.map((date) => {
      let data = null;
      let amount = 0;
      while (!data) {
        const adjDate = subDays(date, amount);
        const formattedDate = format(adjDate, 'yyyy-MM-dd');
        data = rawData.find((raw) => raw.date === formattedDate);
        // fmp free price api provider anuual data
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
  async getMomentumScore(strategy: AssetsStrategy) {
    const daaTickers = tickerListByStrategy<'DAA'>('DAA');
    // const vaaTickers = tickerListByStrategy<'VAA'>('VAA');

    const { offense } = daaTickers;
    const testTicker = offense[0];

    const rawData = await this.getRawHistoricalPrices(testTicker);
    const rawDataBySection = await this.getDataBySection(rawData);

    console.log('rawDataBySection', rawDataBySection);
    return 'Momentum';
  }
}
