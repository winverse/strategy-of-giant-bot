import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfig, Path, PathValue } from '@nestjs/config';
import { Config } from './config.interface';

@Injectable()
export class ConfigService<K = Config> extends NestConfig<K> {
  public override get<P extends Path<K>>(path: P): PathValue<K, P> {
    const value = super.get(path, { infer: true });
    if (!value) {
      throw new Error(`Missing ${path} in env`);
    }
    return value;
  }
}
