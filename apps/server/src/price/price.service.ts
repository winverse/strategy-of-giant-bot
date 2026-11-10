import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { retry } from '#common/utils/async';
import { today } from '#common/utils/date';
import {
  EquiblesClient,
  isTransientEquiblesError,
} from '#price/equibles.client';
import { PriceRepository } from '#price/price.repository';
import type { RawHistoricalPrice } from '#price/price.types';
import { validPrices } from '#price/valid-prices';

@Injectable()
export class PriceService {
  // Lookups in progress, by ticker and day. DAA lists VWO and LQD in two groups
  // and its tickers load in parallel, so without this both lookups miss the
  // cache, fetch, and write a row each.
  private readonly pending = new Map<string, Promise<RawHistoricalPrice[]>>();

  constructor(
    private readonly equiblesClient: EquiblesClient,
    private readonly priceRepository: PriceRepository,
  ) {}
  // Equibles is called once a day per ticker; later calls read the cache
  async getPrices(ticker: string): Promise<RawHistoricalPrice[]> {
    const date = today();
    const key = `${ticker}:${date}`;

    const pending = this.pending.get(key);
    if (pending) return pending;

    const lookup = this.lookup(ticker, date).finally(() =>
      this.pending.delete(key),
    );
    this.pending.set(key, lookup);

    return lookup;
  }
  private async lookup(
    ticker: string,
    date: string,
  ): Promise<RawHistoricalPrice[]> {
    try {
      const cached = await this.priceRepository.find(ticker, date);

      if (cached) return cached.raw as any;

      const prices = await retry(
        5,
        () => this.equiblesClient.getHistoricalPrices(ticker).then(validPrices),
        1000,
        isTransientEquiblesError,
      );

      await this.priceRepository.create({ date, ticker, raw: prices as any });

      return prices;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
