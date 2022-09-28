import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  get mode() {
    return {
      isProd: process.env.NODE_ENV === 'production',
      isDev: process.env.NODE_ENV !== 'production',
    };
  }
  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  sum(a: number, b: number) {
    return a + b;
  }
  twoDecimalPoint(x: number): number {
    return Number(x.toFixed(2));
  }
}
