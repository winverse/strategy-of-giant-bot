import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configuration } from 'src/provider/config/configuration';
import { ConfigModule } from './provider/config/config.module';

@Module({
  imports: [NestConfigModule.forRoot({ load: [configuration] }), ConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
