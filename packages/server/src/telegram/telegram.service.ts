// https://github.com/yagop/node-telegram-bot-api/issues/540
process.env.NTBA_FIX_319 = '1'; // don'remove

import { Injectable } from '@nestjs/common';
import { ConfigService } from '#config/config.service';
import type { TelegramConfig } from '#config/config.types';
import TelegramBot from 'node-telegram-bot-api';

export type TelegramRoom = keyof Omit<TelegramConfig, 'token'>;

@Injectable()
export class TelegramService {
  constructor(private readonly config: ConfigService) {}
  sendMessage(roomName: TelegramRoom, message: string) {
    const { token, ...rest } = this.config.get('telegram');

    const bot = new TelegramBot(token);

    const chatId = rest[roomName];

    if (!chatId) {
      throw new Error('Not found chat id for send telegram message');
    }

    setTimeout(() => {
      bot.sendMessage(chatId, message);
    }, 0);
  }
}
