import { NO_HISTORICAL_DATA } from '#common/errors';
import type { RawHistoricalPrice } from '#price/price.types';

// A row without a finite adjusted close would make the momentum score NaN
export const validPrices = (prices: RawHistoricalPrice[]) => {
  const valid = prices.filter((price) => Number.isFinite(price.adjustedClose));

  if (!valid.length) {
    throw new Error(NO_HISTORICAL_DATA);
  }

  return valid;
};
