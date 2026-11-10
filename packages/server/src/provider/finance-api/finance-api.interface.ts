export interface RawHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number; // Adjusted for splits and dividends
  volume: number;
}

// {
//   date: '2026-11-09',
//   open: 741.95,
//   high: 755.42,
//   low: 741.025,
//   close: 752.69,
//   adjustedClose: 752.69,
//   volume: 50273300
// }

export interface GetHistoricalPriceData {
  ticker: string;
  currency: string;
  data: RawHistoricalPrice[];
  meta: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
}
