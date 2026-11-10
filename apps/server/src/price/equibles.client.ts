import { Injectable } from '@nestjs/common';
import axios, { isAxiosError } from 'axios';
import { format, subMonths } from 'date-fns';
import { ConfigService } from '#config/config.service';
import type {
  GetHistoricalPriceData,
  RawHistoricalPrice,
} from '#price/price.types';

// An Equibles failure without the axios request attached: an AxiosError carries
// the request config and headers, so logging it would print the API key.
export class EquiblesError extends Error {
  constructor(
    readonly ticker: string,
    // HTTP status from Equibles; undefined when no response came back
    readonly status: number | undefined,
    message: string,
  ) {
    super(`Equibles ${ticker}: ${message}`);
    this.name = 'EquiblesError';
  }
}

export const toEquiblesError = (ticker: string, error: unknown) =>
  isAxiosError(error)
    ? new EquiblesError(ticker, error.response?.status, error.message)
    : error;

// Worth another try: no response (network, timeout) or a server error.
// A 4xx such as 429 (daily quota spent) fails the same way again.
export const isTransientEquiblesError = (error: unknown) =>
  error instanceof EquiblesError &&
  (error.status === undefined || error.status >= 500);

@Injectable()
export class EquiblesClient {
  constructor(private readonly config: ConfigService) {}
  private client() {
    const client = axios.create({
      baseURL: 'https://api.equibles.com',
    });

    client.interceptors.request.use((config) => {
      config.headers.set(
        'Authorization',
        `Bearer ${this.config.get('financeApiKey')}`,
      );
      return config;
    });
    return client;
  }

  public async getHistoricalPrices(
    ticker: string,
  ): Promise<RawHistoricalPrice[]> {
    // 12 months of month-end prices, with a margin for holidays
    const startDate = format(subMonths(new Date(), 14), 'yyyy-MM-dd');

    try {
      const { data } = await this.client().get<GetHistoricalPriceData>(
        `/v1/stocks/${ticker}/prices`,
        {
          params: {
            startDate,
            limit: 500,
          },
        },
      );

      return data?.data ?? [];
    } catch (error) {
      throw toEquiblesError(ticker, error);
    }
  }
}
