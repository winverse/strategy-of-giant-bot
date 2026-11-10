import { sum, twoDecimalPoint } from '#common/utils/number';
import type { RawHistoricalPrice } from '#price/price.types';
import { pickMonthEndPrices } from '#strategy/momentum/month-end';
import type { QuarterlyOutline, TickerSummary } from '#strategy/strategy.types';

// 13612W: returns over 1, 3, 6 and 12 months, weighted 12, 4, 2 and 1
const weights = [12, 4, 2, 1];

// Compare the base month-end (first) with each earlier month-end
export const toOutline = ([
  base,
  ...earlier
]: RawHistoricalPrice[]): QuarterlyOutline[] =>
  earlier.map((price, index) => {
    // Adjusted close includes dividends (total return)
    const rateOfReturn = (base.adjustedClose / price.adjustedClose) * 100 - 100;

    return {
      from: price.date,
      to: base.date,
      rateOfReturn: twoDecimalPoint(rateOfReturn),
      // Weight the unrounded return, so rounding is not multiplied by 12
      adjustedReturn: twoDecimalPoint(rateOfReturn * weights[index]),
    };
  });

export const momentumScore = (outline: QuarterlyOutline[]) =>
  twoDecimalPoint(
    outline.map(({ adjustedReturn }) => adjustedReturn).reduce(sum, 0),
  );

export const scoreTicker = (
  name: string,
  prices: RawHistoricalPrice[],
  today: Date,
): TickerSummary => {
  const outline = toOutline(pickMonthEndPrices(prices, today));

  return { name, outline, momentumScore: momentumScore(outline) };
};
