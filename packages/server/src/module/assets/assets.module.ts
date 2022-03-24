import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { FinanceApiModule } from '@provider/finance-api';

@Module({
  imports: [FinanceApiModule],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
