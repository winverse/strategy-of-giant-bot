import Joi from 'joi';
import { Config } from '#config/config.types';

function configValidator(config: Config) {
  const schema = Joi.object().keys({
    app: Joi.object({
      environment: Joi.string()
        .valid('development', 'production', 'test')
        .required(),
      port: Joi.number().required(),
    }),
    telegram: Joi.object().keys({
      token: Joi.string().required(),
      reading: Joi.string().required(),
      error: Joi.string().required(),
    }),
    database: Joi.object().keys({
      provider: Joi.string().required(),
      host: Joi.string().required(),
      database: Joi.string().required(),
      port: Joi.string().required(),
      userName: Joi.string().required(),
      password: Joi.string().allow('').required(),
    }),
    financeApiKey: Joi.string().required(),
  });

  const { error } = schema.validate(config);

  if (error) {
    throw new Error(`config validate failed, message: ${error.message}`);
  }
}

export const configuration = () => {
  // bun test sets NODE_ENV=test, so tests read config/test.ts and never the real keys
  const envFiles: Record<string, string> = {
    production: 'production',
    test: 'test',
  };
  const envfileName = envFiles[process.env.NODE_ENV ?? ''] ?? 'development';

  // Load synchronously, so the config is ready before any provider reads it
  const { config }: { config: Config } = require(`#env/${envfileName}`);

  configValidator(config);

  return config;
};
