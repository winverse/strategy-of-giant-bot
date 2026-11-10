import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { retry } from '#common/utils/async';
import { today } from '#common/utils/date';
import { EquiblesClient } from '#price/equibles.client';
import { PriceRepository } from '#price/price.repository';
import type { RawHistoricalPrice } from '#price/price.types';
import { validPrices } from '#price/valid-prices';

@Injectable()
export class PriceService {
  constructor(
    private readonly equiblesClient: EquiblesClient,
    private readonly priceRepository: PriceRepository,
  ) {}
  // Equibles is called once a day per ticker; later calls read the cache
  async getPrices(ticker: string): Promise<RawHistoricalPrice[]> {
    try {
      const date = today();
      const cached = await this.priceRepository.find(ticker, date);

      if (cached) return cached.raw as any;

      const prices = await retry(5, () =>
        this.equiblesClient.getHistoricalPrices(ticker).then(validPrices),
      );

      await this.priceRepository.create({ date, ticker, raw: prices as any });

      return prices;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
