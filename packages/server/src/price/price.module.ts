import { Module } from '@nestjs/common';
import { ConfigModule } from '#config/config.module';
import { DatabaseModule } from '#database/database.module';
import { EquiblesClient } from '#price/equibles.client';
import { PriceRepository } from '#price/price.repository';
import { PriceService } from '#price/price.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [EquiblesClient, PriceRepository, PriceService],
  exports: [PriceService],
})
export class PriceModule {}
