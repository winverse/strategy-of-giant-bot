import { Controller, Get, Post, Query } from '@nestjs/common';
import { StrategyService } from '#strategy/strategy.service';

@Controller({
  path: '/assets',
  version: ['1'],
})
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}
  @Get('/')
  async getMomentumScores(@Query('strategy') strategy: unknown) {
    return await this.strategyService.getMomentumScores(strategy);
  }

  @Get('/reports')
  async getReport(@Query('strategy') strategy: unknown) {
    return await this.strategyService.getReport(strategy);
  }

  @Post('/')
  async sendReports() {
    await this.strategyService.sendReports();
  }
}
