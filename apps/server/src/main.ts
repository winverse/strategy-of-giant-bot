import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const fastify = setupApp(
    await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    ),
  );

  const port = process.env.PORT;

  if (!port) {
    throw new Error('Missing PORT number in env');
  }

  await fastify.listen(port);
  console.log(`Server is Running: ${await fastify.getUrl()}`);
}

bootstrap();
