import { Module } from '@nestjs/common';
import { TickersService } from '@module/tickers/tickers.service';
import { PrismaModule } from '@provider/prisma';

@Module({
  imports: [PrismaModule],
  providers: [TickersService],
  exports: [TickersService],
})
export class TickersModule {}
