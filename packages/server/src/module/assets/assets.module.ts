import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { FinanceApiModule } from '@provider/finance-api';
import { UtilsModule } from '@provider/utils';

@Module({
  imports: [FinanceApiModule, UtilsModule],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
