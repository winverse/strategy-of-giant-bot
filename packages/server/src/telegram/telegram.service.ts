import { Injectable } from '@nestjs/common';
import { ConfigService } from '#config/config.service';
import type { TelegramConfig } from '#config/config.types';
import { Api } from 'node-telegram-bot-api';

export type TelegramRoom = keyof Omit<TelegramConfig, 'token'>;

@Injectable()
export class TelegramService {
  constructor(private readonly config: ConfigService) {}
  sendMessage(roomName: TelegramRoom, message: string) {
    const { token, ...rest } = this.config.get('telegram');

    const api = new Api(token);

    const chatId = rest[roomName];

    if (!chatId) {
      throw new Error('Not found chat id for send telegram message');
    }

    setTimeout(() => {
      api.sendMessage({ chat_id: chatId, text: message });
    }, 0);
  }
}
