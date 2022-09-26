import { Module } from '@nestjs/common';
import { TickerService } from '@provider/ticker/ticker.service';

@Module({
  providers: [TickerService],
  exports: [TickerService],
})
export class TickerModule {}
