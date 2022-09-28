import { AssetsStrategy } from '@module/assets/assets.interface';
import { AssetsService } from '@module/assets/assets.service';
import { Controller, Get, Query } from '@nestjs/common';

@Controller({
  path: '/assets',
  version: ['1'],
})
export class AssetsController {
  constructor(private assetsService: AssetsService) {}
  @Get('/')
  async getMomentumScore(@Query('strategy') strategy: AssetsStrategy) {
    return await this.assetsService.getMomentumScoreByStretegy(strategy);
  }

  // to-do: send result to telegram
}
