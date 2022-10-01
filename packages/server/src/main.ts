import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const fastify = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  fastify.setGlobalPrefix('/api');
  fastify.enableVersioning({
    type: VersioningType.URI,
  });

  const port = process.env.PORT;

  if (!port) {
    throw new Error('Missing PORT number in env');
  }
  await fastify.listen(port, (err, address) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Server is Running: ${address}`);
  });
}

bootstrap();
