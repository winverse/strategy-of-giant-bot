import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@provider/config';
import { GetHistoricalPriceData } from '@provider/finance-api/finance-api.interface';
import { UtilsService } from '@provider/utils';
import axios from 'axios';
import { format, subDays } from 'date-fns';

@Injectable()
export class FinanceApiService {
  constructor(private config: ConfigService, private utils: UtilsService) {}
  private client() {
    const client = axios.create({
      baseURL: 'https://financialmodelingprep.com',
    });

    client.interceptors.request.use((config) => {
      config.params = {
        ...(config.params || {}),
        apikey: this.config.get('financeApiKey'),
      };
      return config;
    });
    return client;
  }

  public async getHistoricalPrice(ticker: string) {
    try {
      const client = this.client();

      const now = new Date();
      const to = format(now, 'yyyy-MM-dd');
      const from = subDays(now, 375);
      const duration = {
        from,
        to,
      };

      const { data } = await client.get<GetHistoricalPriceData>(
        `/api/v3/historical-price-full/${ticker}`,
        {
          params: duration,
        },
      );

      return data.historical;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
