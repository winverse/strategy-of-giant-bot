export interface AppConfig {
  readonly environment: string;
  readonly port: number;
  readonly clientHost: string;
  readonly apiHost: string;
}

export interface TelegramConfig {
  readonly token: string;
  readonly reading: string;
  readonly error: string;
}

export interface DatabaseConfig {
  readonly provider: string;
  readonly host: string;
  readonly database: string;
  readonly port: string;
  readonly userName: string;
  readonly password: string;
}

export interface Config {
  app: AppConfig;
  telegram: TelegramConfig;
  database: DatabaseConfig;
  financeApiKey: string;
}
