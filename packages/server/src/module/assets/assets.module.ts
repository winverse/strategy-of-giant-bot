import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { FinanceApiModule } from '@provider/finance-api';
import { UtilsModule } from '@provider/utils';
import { PrismaModule } from '@provider/prisma';

@Module({
  imports: [FinanceApiModule, UtilsModule, PrismaModule],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
