import { tickerListByStrategy } from '@common/helper/ticker-list-by-starategy';
import { AssetsStrategy } from '@module/assets/assets.interface';
import { Injectable } from '@nestjs/common';
import { FinanceApiService } from '@provider/finance-api';

@Injectable()
export class AssetsService {
  constructor(private financeApi: FinanceApiService) {}
  private async rawHistoricalPrices(ticker: string) {
    // 오늘 날짜와 ticker 비교해서 데이터베이스에 값이 있으면 디비 저장 값 리턴
    const rawData = await this.financeApi.getHistoricalPrice(ticker);
    console.log(rawData);
  }
  private groupByMonth() {}
  async getMomentumScore(strategy: AssetsStrategy) {
    const daaTickers = tickerListByStrategy<'DAA'>('DAA');
    // const vaaTickers = tickerListByStrategy<'VAA'>('VAA');

    const { offense } = daaTickers;
    const testTicker = offense[0];

    await this.rawHistoricalPrices(testTicker);
    return 'Momentum';
  }
}
