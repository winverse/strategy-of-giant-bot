import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { format, subMonths } from 'date-fns';
import { ConfigService } from '#config/config.service';
import type {
  GetHistoricalPriceData,
  RawHistoricalPrice,
} from '#price/price.types';

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
  }
}
