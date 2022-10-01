import { UtilsModule } from '@provider/utils';
import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { TickersModule } from '@module/tickers';

@Module({
  imports: [UtilsModule, TickersModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
