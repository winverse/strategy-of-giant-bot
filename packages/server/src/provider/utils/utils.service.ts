import { Injectable } from '@nestjs/common';
import { UtilsMode } from '@provider/utils/utils.interface';

@Injectable()
export class UtilsService {
  public readonly mode: UtilsMode;
  constructor() {
    this.mode = {
      isProd: process.env.NODE_ENV === 'production',
      isDev: process.env.NODE_ENV !== 'production',
    };
  }
  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
