import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL here instead of schema.prisma.
// process.env (not env()) so that commands without a database, such as
// `prisma generate`, still run when DATABASE_URL is not set.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
