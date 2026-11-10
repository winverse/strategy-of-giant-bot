import type {
  MomentumScoreSummary,
  TickerSummary,
} from '#strategy/strategy.types';

export const findGroup = (summary: MomentumScoreSummary[], group: string) => {
  const found = summary.find((data) => data.group === group);

  if (!found) {
    throw new Error(`Not found summary group: ${group}`);
  }

  return found.tickers;
};

// Highest momentum scores first, without reordering the input
export const topByScore = (tickers: TickerSummary[], count: number) =>
  [...tickers]
    .sort((a, b) => b.momentumScore - a.momentumScore)
    .slice(0, count);
