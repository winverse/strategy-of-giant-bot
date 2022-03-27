export interface RawHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  unadjustedVolume: number;
  change: number;
  changePercent: number;
  vwap: number;
  label: string;
  changeOverTime: number;
}

// {
//   date: '2021-11-03',
//   open: 461.299988,
//   high: 465.149994,
//   low: 460.829987,
//   close: 464.720001,
//   adjClose: 461.658844,
//   volume: 52509800,
//   unadjustedVolume: 52509800,
//   change: 3.42001,
//   changePercent: 0.741,
//   vwap: 463.56666,
//   label: 'November 03, 21',
//   changeOverTime: 0.00741
// }

export interface GetHistoricalPriceData {
  symbol: string;
  historical: RawHistoricalPrice[];
}
