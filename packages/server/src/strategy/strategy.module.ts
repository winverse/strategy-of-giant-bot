import { Module } from '@nestjs/common';
import { PriceModule } from '#price/price.module';
import { StrategyController } from '#strategy/strategy.controller';
import { StrategyService } from '#strategy/strategy.service';
import { TelegramModule } from '#telegram/telegram.module';

@Module({
  imports: [PriceModule, TelegramModule],
  providers: [StrategyService],
  controllers: [StrategyController],
})
export class StrategyModule {}
