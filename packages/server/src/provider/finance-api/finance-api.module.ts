import { Module } from '@nestjs/common';
import { ConfigModule } from '@provider/config';
import { UtilsModule } from '@provider/utils';
import { FinanceApiService } from './finance-api.service';

@Module({
  imports: [ConfigModule, UtilsModule],
  providers: [FinanceApiService],
  exports: [FinanceApiService],
})
export class FinanceApiModule {}
