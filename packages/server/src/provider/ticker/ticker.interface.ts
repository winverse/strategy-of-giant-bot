import { AssetsStrategy } from '@module/assets/assets.interface';

interface VAATickers {
  offense: string[];
  deffense: string[];
}

interface DAATickers extends VAATickers {
  canary: string[];
}

export type TickerListTypeGuard<T extends AssetsStrategy> = T extends 'VAA'
  ? VAATickers
  : T extends 'DAA'
  ? DAATickers
  : never;
