import path from 'node:path';
import fs from 'node:fs';
import type { Config } from '#config/config.types';

class WriteEnv {
  isDev = false;
  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
  }
  public async write() {
    const baseFileName = this.isDev ? 'development' : 'production';
    const configFilePath = path.resolve(
      process.cwd(),
      `config/${baseFileName}.ts`,
    );

    if (!fs.existsSync(configFilePath)) {
      throw new Error(`Not found [${baseFileName}.ts] config file`);
    }

    const { config }: { config: Config } = await import(configFilePath);

    const { provider, userName, password, host, database, port } =
      config.database;

    // write env
    const { app } = config;

    const databaseUrl = `${provider}://${userName}:${password}@${host}:${port}/${database}?schema=public`;
    const envFilePath = path.resolve(process.cwd(), `.env`);
    await fs.writeFileSync(
      envFilePath,
      `PORT=${app.port}
       DATABASE_URL=${databaseUrl}
    `.replace(/ /gi, ''),
    );
  }
}

(async () => {
  try {
    const writeEnv = new WriteEnv();

    await writeEnv.write();
  } catch (error) {
    throw new Error(error as any);
  }
})();
