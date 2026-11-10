import { Injectable } from '@nestjs/common';
import type { Prisma, Tickers } from '@prisma/client';
import { PrismaService } from '#database/prisma.service';

// Prices fetched from Equibles, cached per ticker per day
@Injectable()
export class PriceRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(ticker: string, date: string): Promise<Tickers | null> {
    return this.prisma.tickers.findFirst({ where: { ticker, date } });
  }
  create(input: Prisma.TickersCreateInput): Promise<Tickers> {
    return this.prisma.tickers.create({ data: input });
  }
}
