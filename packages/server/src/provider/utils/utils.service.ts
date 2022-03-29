import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
