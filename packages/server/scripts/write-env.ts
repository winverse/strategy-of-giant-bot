import path from 'path';
import fs from 'fs';
import { Config } from '@provider/config';

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

    // write env
    const { app } = config;

    const envFilePath = path.resolve(process.cwd(), `.env`);
    await fs.writeFileSync(envFilePath, `PORT=${app.port}`);
  }
}

(async function () {
  try {
    const writeEnv = new WriteEnv();

    await writeEnv.write();
  } catch (error) {
    throw new Error(error);
  }
})();
