import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { FinanceApiModule } from '@provider/finance-api';
import { UtilsModule } from '@provider/utils';
import { TickersModule } from '@module/tickers/tickers.module';
import { MessagesModule } from '@provider/messages';

@Module({
  imports: [FinanceApiModule, UtilsModule, TickersModule, MessagesModule],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
