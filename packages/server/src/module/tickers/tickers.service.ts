import { Prisma, Tickers } from '@prisma/client';
import { AssetsStrategy } from '@module/assets/assets.interface';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@provider/prisma';
import { UsedAllTickers } from '@module/tickers/tickers.interface';

@Injectable()
export class TickersService {
  constructor(private readonly prisma: PrismaService) {}
  getDescriptionByTicker(ticker: UsedAllTickers) {
    const upperTickerName = ticker.toUpperCase();
    const description: Record<UsedAllTickers, string> = {
      QQQ: '나스닥 100',
      SPY: 'S&P500',
      VEA: '미국 제외 선진국',
      VWO: '신흥국',
      TLT: '미국 장기 채권',
      SHY: '미국 단기(1~3년) 채권',
      IEF: '미국 중기(7~10년) 채권',
      AGG: '미국 혼합 채권',
      BND: '투자적격등급의 미국 혼합 채권',
      LQD: '미국 기업 채권',
      IWM: '러셀 2000',
      VGK: '유럽 선진국',
      EWJ: '니케이',
      VNQ: '미국 부동산(리츠)',
      GSG: '원자재',
      GLD: '금',
      HYG: '이자가 높은 부실 채권을 매입',
    };

    return description[upperTickerName];
  }
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
  ): Promise<Tickers | null> {
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
  async createTicker(input: Prisma.TickersCreateInput): Promise<Tickers> {
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
