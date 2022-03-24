import { AssetsStrategy } from '@module/assets/assets.interface';

interface VAATickers {
  offense: string[];
  deffense: string[];
}

interface DAATickers extends VAATickers {
  canary: string[];
}

type TickerListTypeGuard<T extends AssetsStrategy> = T extends 'VAA'
  ? VAATickers
  : T extends 'DAA'
  ? DAATickers
  : unknown;

export const tickerListByStrategy = <T extends AssetsStrategy>(
  strategy: AssetsStrategy,
): TickerListTypeGuard<T> => {
  const tickersList = {
    VAA: {
      offense: ['SPY', 'VEA', 'VWO', 'AGG'],
      deffense: ['SHY', 'IEF', 'LQD'],
    },
    DAA: {
      canary: ['BND', 'VWO', 'KOSPI'],
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

  return tickersList[strategy] as TickerListTypeGuard<T>;
};
