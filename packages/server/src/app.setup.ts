import { VersioningType } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Shared by main.ts and the HTTP tests, so both serve the same routes (/api/v1/...)
export const setupApp = (app: NestFastifyApplication) => {
  app.setGlobalPrefix('/api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  return app;
};
