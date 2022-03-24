import { Module } from '@nestjs/common';
import { ConfigModule } from '@provider/config';
import { LoggerModule } from '@provider/logger';
import { FinanceApiService } from './finance-api.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [FinanceApiService],
})
export class FinanceApiModule {}
