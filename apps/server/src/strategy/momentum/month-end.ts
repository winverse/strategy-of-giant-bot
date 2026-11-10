import { endOfMonth, format, subDays, subMonths } from 'date-fns';
import type { RawHistoricalPrice } from '#price/price.types';

// The base month-end is the end of last month; the others are 1, 3, 6 and 12 months before it
const monthsAgo = [0, 1, 3, 6, 12];

// A month-end can fall on a weekend or holiday, so look back up to 10 days
const closedDays = Array.from({ length: 11 }, (_, diff) => diff);

// Last trading day of each month-end, base month-end first
export const pickMonthEndPrices = (
  prices: RawHistoricalPrice[],
  today: Date,
): RawHistoricalPrice[] =>
  monthsAgo
    .map((months) => endOfMonth(subMonths(today, months + 1)))
    .map(
      (monthEnd) =>
        closedDays
          .map((diff) => format(subDays(monthEnd, diff), 'yyyy-MM-dd'))
          .map((date) => prices.find((price) => price.date === date))
          .find((price) => price !== undefined) ?? prices[prices.length - 1],
    );
