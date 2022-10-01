import { AssetsStrategy } from '@module/assets/assets.interface';

type VAATickers = {
  offense: string[];
  deffense: string[];
};

type DAATickers = VAATickers & {
  canary: string[];
};

export type TickersTypeGuard<T extends AssetsStrategy> = T extends 'VAA'
  ? VAATickers
  : T extends 'DAA'
  ? DAATickers
  : never;

export type UsedAllTickers =
  | 'SPY'
  | 'IWM'
  | 'QQQ'
  | 'VGK'
  | 'EWJ'
  | 'VWO'
  | 'VNQ'
  | 'GSG'
  | 'GLD'
  | 'TLT'
  | 'HYG'
  | 'LQD'
  | 'VEA'
  | 'AGG'
  | 'IEF'
  | 'BND'
  | 'SHY';
