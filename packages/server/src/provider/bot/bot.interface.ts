import { TelegramConfig } from '@provider/config';

export type BotRoomName = keyof Omit<TelegramConfig, 'token'>;
