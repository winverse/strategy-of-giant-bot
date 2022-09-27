import { Prisma, Tickers } from '@prisma/client';
import { AssetsStrategy } from '@module/assets/assets.interface';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@provider/prisma';

@Injectable()
export class TickersService {
  constructor(private readonly prisma: PrismaService) {}
  getTickersByStrategy(strategy: AssetsStrategy): Record<string, string[]> {
    const tickers = {
      VAA: {
        offense: ['SPY', 'VEA', 'VWO', 'AGG'],
        deffense: ['SHY', 'IEF', 'LQD'],
      },
      DAA: {
        canary: ['BND', 'VWO'],
        offense: [
          'SPY',
          'IWM',
          'QQQ',
          'VGK',
          'EWJ',
          'VWO',
          'VNQ',
          'GSG',
          'GLD',
          'TLT',
          'HYG',
          'LQD',
        ],
        deffense: ['SHY', 'IEF', 'LQD'],
      },
    };
    return tickers[strategy];
  }
  async findByTicker(
    ticker: string,
    input?: Prisma.TickersWhereInput,
  ): Promise<Tickers> | undefined {
    try {
      const data = await this.prisma.tickers.findFirst({
        where: {
          ticker: ticker,
          ...input,
        },
      });

      return data;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async create(input: Prisma.TickersCreateInput): Promise<Tickers> {
    try {
      const data = await this.prisma.tickers.create({
        data: {
          ...input,
        },
      });

      return data;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
