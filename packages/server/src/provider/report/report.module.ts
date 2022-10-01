import { UtilsModule } from '@provider/utils';
import { Module } from '@nestjs/common';
import { ReportService } from './report.service';

@Module({
  imports: [UtilsModule],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
