import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@provider/config';
import { GetHistoricalPriceData } from '@provider/finance-api/finance-api.interface';
import axios from 'axios';
import { format, subYears } from 'date-fns';

@Injectable()
export class FinanceApiService {
  constructor(private config: ConfigService) {}
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

      const { data } = await client.get<GetHistoricalPriceData>(
        `/api/v3/historical-price-full/${ticker}`,
      );

      return data.historical;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
