// https://github.com/yagop/node-telegram-bot-api/issues/540
process.env.NTBA_FIX_319 = '1'; // don'remove

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@provider/config';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class BotService {
  constructor(private readonly config: ConfigService) {}
  telegramSendMessage(message: string) {
    const { token, chatId } = this.config.get('telegram');

    const bot = new TelegramBot(token);

    if (!chatId) {
      throw new Error('Not found chat id for send telegram message');
    }

    setTimeout(() => {
      bot.sendMessage(chatId, message);
    }, 0);
  }
}
