import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BAD_REQUEST } from '#common/errors';
import { sleep } from '#common/utils/async';
import { PriceService } from '#price/price.service';
import { allocateDAA } from '#strategy/allocation/daa';
import { allocateVAA } from '#strategy/allocation/vaa';
import { scoreTicker } from '#strategy/momentum/score';
import { daaMessage, vaaMessage } from '#strategy/report/message';
import type { MomentumScoreSummary, Strategy } from '#strategy/strategy.types';
import { tickersByStrategy } from '#strategy/tickers';
import { TelegramService } from '#telegram/telegram.service';

const strategies: Strategy[] = ['VAA', 'DAA'];

const reportTable: Record<
  Strategy,
  (summary: MomentumScoreSummary[], today: Date) => string
> = {
  VAA: (summary, today) => vaaMessage(summary, allocateVAA(summary), today),
  DAA: (summary, today) => daaMessage(summary, allocateDAA(summary), today),
};

@Injectable()
export class StrategyService {
  constructor(
    private readonly priceService: PriceService,
    private readonly telegramService: TelegramService,
  ) {}
  // Accept 'vaa' or 'VAA'; a missing or unknown strategy is a bad request (400)
  private toStrategy(strategy?: string): Strategy {
    const upperStrategy = strategy?.toUpperCase() as Strategy;
    if (!strategies.includes(upperStrategy)) {
      throw new BadRequestException(BAD_REQUEST);
    }

    return upperStrategy;
  }
  async getMomentumScores(strategy?: string): Promise<MomentumScoreSummary[]> {
    const upperStrategy = this.toStrategy(strategy);

    try {
      const today = new Date();

      return await Promise.all(
        Object.entries(tickersByStrategy[upperStrategy]).map(
          async ([group, tickers]) => ({
            group,
            tickers: await Promise.all(
              tickers.map(async (ticker) =>
                scoreTicker(
                  ticker,
                  await this.priceService.getPrices(ticker),
                  today,
                ),
              ),
            ),
          }),
        ),
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async getReport(strategy?: string): Promise<string> {
    const upperStrategy = this.toStrategy(strategy);
    const summary = await this.getMomentumScores(upperStrategy);

    try {
      return reportTable[upperStrategy](summary, new Date());
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  @Cron('0 0 6 * * 1-5') // Monday to Friday at 06:00am
  async updatePrices() {
    for (const strategy of strategies) {
      await sleep(1000);
      await this.getMomentumScores(strategy);
    }
  }
  @Cron('0 1 6 * * 1-5') // Monday to Friday at 06:01am
  async sendReports() {
    for (const strategy of strategies) {
      const report = await this.getReport(strategy);
      await this.telegramService.sendMessage('reading', report);
    }
  }
}
