import Joi from 'joi';
import { Config } from './config.interface';

function configValidator(config: Config) {
  const schema = Joi.object().keys({
    app: Joi.object({
      environment: Joi.string().valid('development', 'production').required(),
      port: Joi.number().required(),
      clientHost: Joi.string().required(),
      apiHost: Joi.string().required(),
    }),
    telegram: Joi.object().keys({
      token: Joi.string().required(),
      chatId: Joi.string().required(),
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

export const configuration = async () => {
  const envfileName =
    process.env.NODE_ENV !== 'production' ? 'development' : 'production';

  const { config }: { config: Config } = await import(
    `../../../config/${envfileName}`
  );

  configValidator(config);

  return config;
};
