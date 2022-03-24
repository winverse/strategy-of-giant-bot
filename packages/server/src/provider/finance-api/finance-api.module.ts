import { Module } from '@nestjs/common';
import { ConfigModule } from '@provider/config';
import { FinanceApiService } from './finance-api.service';

@Module({
  imports: [ConfigModule],
  providers: [FinanceApiService],
  exports: [FinanceApiService],
})
export class FinanceApiModule {}
