export type AssetsStrategy = 'VAA' | 'DAA';

export type QuarterlyOutline = {
  to: string;
  from: string;
  rateOfRetrun: number;
  adjustedReturn: number;
};

export type TickerSummary = {
  name: string;
  outline: QuarterlyOutline[];
  momentumScore: number;
};

export type MomentumScoreSummary = {
  group: string;
  tickers: TickerSummary[];
};
