import type { Strategy } from '#strategy/strategy.types';

export const tickerDescriptions = {
  QQQ: '나스닥 100',
  SPY: 'S&P500',
  VEA: '미국 제외 선진국',
  VWO: '신흥국',
  TLT: '미국 장기 채권',
  SHY: '미국 단기(1~3년) 채권',
  IEF: '미국 중기(7~10년) 채권',
  AGG: '미국 혼합 채권',
  BND: '투자적격등급의 미국 혼합 채권',
  LQD: '미국 기업 채권',
  IWM: '러셀 2000',
  VGK: '유럽 선진국',
  EWJ: '니케이',
  VNQ: '미국 부동산(리츠)',
  GSG: '원자재',
  GLD: '금',
  HYG: '이자가 높은 부실 채권을 매입',
} as const;

export type Ticker = keyof typeof tickerDescriptions;

export const describeTicker = (ticker: string): string | undefined =>
  tickerDescriptions[ticker.toUpperCase() as Ticker];

// Tickers each strategy compares, by group
export const tickersByStrategy: Record<Strategy, Record<string, Ticker[]>> = {
  VAA: {
    offense: ['SPY', 'VEA', 'VWO', 'AGG'],
    defense: ['SHY', 'IEF', 'LQD'],
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
    defense: ['SHY', 'IEF', 'LQD'],
  },
};
