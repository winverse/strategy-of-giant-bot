import { format } from 'date-fns';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  get mode() {
    return {
      isProd: process.env.NODE_ENV === 'production',
      isDev: process.env.NODE_ENV !== 'production',
    };
  }
  today(form = 'yy-MM-dd') {
    return format(new Date(), form);
  }
  sleep(delay: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
  sum(a: number, b: number) {
    return a + b;
  }
  twoDecimalPoint(x: number): number {
    return Number(x.toFixed(2));
  }
  retry(
    time = 5,
    delay: number | (() => Promise<any>),
    cb?: () => Promise<any>,
  ): Promise<any> {
    if (!cb) {
      cb = delay as () => Promise<any>;
      delay = 1000;
    }

    const sleep = (ms) => this.sleep(ms);
    const retry = (_time, _delay, _cb) => this.retry(_time, _delay, _cb);
    return new Promise(function (resolve, reject) {
      if (!cb) return;
      return cb()
        .then(resolve)
        .catch(function (reason) {
          if (time > 0) {
            return sleep(delay as number)
              .then(retry.bind(null, time - 1, delay, cb))
              .then(resolve)
              .catch(reject);
          }
          return reject(reason);
        });
    });
  }
}
