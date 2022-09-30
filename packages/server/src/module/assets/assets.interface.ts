export type AssetsStrategy = 'VAA' | 'DAA';

export type QuarterlyOutline = {
  to: Date;
  from: Date;
  rateOfRetrun: number;
  adjustedReturn: number;
};

export type MomentumScoreSummary = {
  group: string;
  data: {
    ticker: string;
    outline: QuarterlyOutline[];
    totalMomentumScore: number;
  }[];
};
