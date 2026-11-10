export type Strategy = 'VAA' | 'DAA';

// Return from one month-end close to the base month-end close
export type QuarterlyOutline = {
  from: string;
  to: string;
  rateOfReturn: number;
  // rateOfReturn times its 13612W weight
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
