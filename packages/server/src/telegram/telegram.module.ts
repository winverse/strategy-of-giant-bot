import { Module } from '@nestjs/common';
import { ConfigModule } from '#config/config.module';
import { TelegramService } from '#telegram/telegram.service';

@Module({
  imports: [ConfigModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
