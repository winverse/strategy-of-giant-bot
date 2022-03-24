export interface AppConfig {
  readonly environment: string;
  readonly port: number;
  readonly clientHost: string;
  readonly apiHost: string;
}

export interface Config {
  app: AppConfig;
  financeApiKey: string;
}
