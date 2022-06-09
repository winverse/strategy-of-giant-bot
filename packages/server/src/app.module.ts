import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { LoggerModule } from '@provider/logger';
import { configuration } from 'src/provider/config/configuration';
import { ConfigModule } from './provider/config/config.module';
import { FinanceApiModule } from './provider/finance-api/finance-api.module';
import { AssetsModule } from './module/assets/assets.module';
import { UtilsModule } from './provider/utils/utils.module';
import { PrismaModule } from './provider/prisma/prisma.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ load: [configuration] }),
    ConfigModule,
    LoggerModule,
    FinanceApiModule,
    AssetsModule,
    UtilsModule,
    PrismaModule,
  ],
  providers: [],
})
export class AppModule {}
