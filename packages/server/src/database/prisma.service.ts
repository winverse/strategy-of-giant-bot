import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  getClient() {
    return this;
  }

  exclude<T, Key extends keyof T>(table: T, ...keys: Key[]): Omit<T, Key> {
    for (const key of keys) {
      delete table[key];
    }
    return table;
  }
}
