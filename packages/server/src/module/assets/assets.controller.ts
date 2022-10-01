import { UtilsService } from '@provider/utils';
import { AssetsStrategy } from '@module/assets/assets.interface';
import { AssetsService } from '@module/assets/assets.service';
import { Controller, Get, Query } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BotService } from '@provider/bot';

@Controller({
  path: '/assets',
  version: ['1'],
})
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly uitlsService: UtilsService,
    private readonly botService: BotService,
  ) {}
  @Get('/')
  async getMomentumScore(@Query('strategy') strategy: AssetsStrategy) {
    return await this.assetsService.getMomentumScoreByStretegy(strategy);
  }

  @Get('/reports')
  async printReport(@Query('strategy') strategy: AssetsStrategy) {
    const momentumScoreSummary =
      await this.assetsService.getMomentumScoreByStretegy(strategy);
    return await this.assetsService.printReportMessage(
      strategy,
      momentumScoreSummary,
    );
  }

  @Cron('0 0 6 * * 1-5') // Monday to Friday at 06:00am
  async updateRawDataByStretegy() {
    const strategies: AssetsStrategy[] = ['VAA', 'DAA'];
    for (const strategy of strategies) {
      await this.uitlsService.sleep(1000);
      await this.assetsService.getMomentumScoreByStretegy(strategy);
    }
    console.log('성공');
  }

  @Cron('0 1 6 * * 1-5') // Monday to Friday at 06:01am
  async sendReportToTelegram() {
    const strategies: AssetsStrategy[] = ['VAA', 'DAA'];

    for (const strategy of strategies) {
      const momentumScoreSummary =
        await this.assetsService.getMomentumScoreByStretegy(strategy);
      const report = await this.assetsService.printReportMessage(
        strategy,
        momentumScoreSummary,
      );
      await this.botService.telegramSendMessage('reading', report);
    }
  }
}
