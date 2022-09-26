import { AssetsStrategy } from '@module/assets/assets.interface';
import { Injectable } from '@nestjs/common';
import { TickerListTypeGuard } from '@provider/ticker/ticker.interface';

@Injectable()
export class TickerService {
  getTickersByStrategy<T extends AssetsStrategy>(
    strategy: AssetsStrategy,
  ): TickerListTypeGuard<T> {
    const tickers = {
      VAA: {
        offense: ['SPY', 'VEA', 'VWO', 'AGG'],
        deffense: ['SHY', 'IEF', 'LQD'],
      },
      DAA: {
        canary: ['BND', 'VWO'],
        offense: [
          'SPY',
          'IWM',
          'QQQ',
          'VGK',
          'EWJ',
          'VWO',
          'VNQ',
          'GSG',
          'GLD',
          'TLT',
          'HYG',
          'LQD',
        ],
        deffense: ['SHY', 'IEF', 'LQD'],
      },
    };

    return tickers[strategy] as TickerListTypeGuard<T>;
  }
}
