import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpExceptionFilter } from '#common/filters/http-exception.filter';
import { ConfigModule } from '#config/config.module';
import { configuration } from '#config/configuration';
import { LoggerModule } from '#logger/logger.module';
import { StrategyModule } from '#strategy/strategy.module';
import { TelegramModule } from '#telegram/telegram.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ load: [configuration] }),
    ScheduleModule.forRoot(),
    ConfigModule,
    LoggerModule,
    TelegramModule,
    StrategyModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
