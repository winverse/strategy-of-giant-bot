import { NO_HISTORICAL_DATA } from '#constants/errors/errors.contants';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '#provider/config';
import { GetHistoricalPriceData } from '#provider/finance-api/finance-api.interface';
import axios from 'axios';
import { format, subMonths } from 'date-fns';

@Injectable()
export class FinanceApiService {
  constructor(private config: ConfigService) {}
  private client() {
    const client = axios.create({
      baseURL: 'https://api.equibles.com',
    });

    client.interceptors.request.use((config) => {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${this.config.get('financeApiKey')}`,
      };
      return config;
    });
    return client;
  }

  public async getHistoricalPrice(ticker: string) {
    try {
      const client = this.client();

      // 12 months of month-end prices, with a margin for holidays
      const startDate = format(subMonths(new Date(), 14), 'yyyy-MM-dd');

      const { data } = await client.get<GetHistoricalPriceData>(
        `/v1/stocks/${ticker}/prices`,
        {
          params: {
            startDate,
            limit: 500,
          },
        },
      );

      if (!data?.data?.length) {
        throw new Error(NO_HISTORICAL_DATA);
      }

      return data.data;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
