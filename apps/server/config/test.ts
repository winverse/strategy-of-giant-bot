// Fake values for bun test (NODE_ENV=test). Nothing here reaches a real service:
// the tests replace Equibles, the database and Telegram with stand-ins.
export const config = {
  app: {
    environment: 'test',
    port: 0,
  },
  telegram: {
    token: 'test-token',
    reading: 'test-reading-chat',
    error: 'test-error-chat',
  },
  database: {
    provider: 'postgresql',
    host: '127.0.0.1',
    database: 'test',
    port: '5432',
    userName: 'test',
    password: '',
  },
  financeApiKey: 'test-key',
};
