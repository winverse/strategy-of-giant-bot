import { UsedAllTickers } from '#module/tickers/tickers.interface';
import { TickerSummary } from '#module/assets/assets.interface';
import { MomentumScoreReportResult } from './report.interface';
import { MomentumScoreSummary } from '#module/assets/assets.interface';
import { UtilsService } from '#provider/utils';
import { Injectable } from '@nestjs/common';
import { TickersService } from '#module/tickers';

@Injectable()
export class ReportService {
  constructor(
    private readonly utils: UtilsService,
    private readonly tickersService: TickersService,
  ) {}
  get today() {
    return this.utils.today('yy년 MM월 dd일');
  }
  getBaseDate(summary: MomentumScoreSummary[]) {
    return summary
      .flatMap((groups) => groups.tickers)
      .map((ticker) => ticker.outline[0]?.to)
      .find((date) => date !== undefined);
  }
  getMomentumScoreForTickers(summary: MomentumScoreSummary[]) {
    const set = new Set();
    return summary
      .flatMap((groups) => groups.tickers)
      .flatMap((ticker) => {
        if (set.has(ticker.name)) return [];
        set.add(ticker.name);
        return [
          {
            name: ticker.name,
            momentumScore: ticker.momentumScore,
            description: this.tickersService.getDescriptionByTicker(
              ticker.name as UsedAllTickers,
            ),
          },
        ];
      })
      .sort((a, b) => b.momentumScore - a.momentumScore);
  }
  createReportForVAAStarategy(
    summary: MomentumScoreSummary[],
  ): MomentumScoreReportResult {
    const offenseSummary = summary.find((data) => data.group === 'offense');
    const deffenseSummary = summary.find((data) => data.group === 'deffense');

    if (!offenseSummary || !deffenseSummary) {
      throw new Error('Not found Summary Group');
    }

    const minusMomentumScoreInOffense = offenseSummary.tickers.filter(
      (ticker) => ticker.momentumScore < 0,
    );

    const isMinusMomentumScoreInOffense =
      minusMomentumScoreInOffense.length > 0;

    const findBestMomentumSocreTicker = (data: TickerSummary[]) =>
      data.sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 1);

    const selectedTickerData = findBestMomentumSocreTicker(
      isMinusMomentumScoreInOffense
        ? deffenseSummary.tickers
        : offenseSummary.tickers,
    )[0];

    const momentumScoreInfo = this.getMomentumScoreForTickers(summary);

    let message = `[VAA Strategy]\n`;
    message += `날짜: ${this.today}\n`;
    message += `기준일: ${this.getBaseDate(summary)} (월말 종가)\n\n`;
    message += `${offenseSummary.tickers.length}개의 공격 자산 중 모멘텀 스코어 수치가 Minus인 종목의 개수는 ${minusMomentumScoreInOffense.length}입니다.\n`;
    message += `${
      isMinusMomentumScoreInOffense ? '안전' : '공격'
    }자산 중 구매 종목은 ${selectedTickerData.name} 이며\n`;
    message += `모멘텀 스코어 점수는 ${selectedTickerData.momentumScore} 입니다.\n\n`;
    message += `All VAA tickers 모멘텀 스코어 정보\n\n`;
    momentumScoreInfo.forEach((ticker) => {
      message += `${ticker.name}(${ticker.description}): ${ticker.momentumScore}\n`;
    });

    const meta = {
      isMinusMomentumScoreInOffense,
      selectedTickerData,
      momentumScoreInfo,
    };

    return { message, meta };
  }
  createReportForDAAStarategy(
    summary: MomentumScoreSummary[],
  ): MomentumScoreReportResult {
    const canarySummary = summary.find((outline) => outline.group === 'canary');
    const offenseSummary = summary.find(
      (outline) => outline.group === 'offense',
    );
    const deffenseSummary = summary.find(
      (outline) => outline.group === 'deffense',
    );

    if (!offenseSummary || !deffenseSummary || !canarySummary) {
      throw new Error('Not found Summary Group');
    }

    const plusMomentumScoreInCanary = canarySummary.tickers.filter(
      (ticker) => ticker.momentumScore > 0,
    );

    // Buying ratio of offense by canary (2: 100%, 1: 50%, 0: 0%)
    const buyingRatio = plusMomentumScoreInCanary.length * 0.5 * 100;
    const deffenseRatio = 100 - buyingRatio;

    const findBestMomentumScoreTickers = (
      data: TickerSummary[],
      count: number,
    ) =>
      [...data]
        .sort((a, b) => b.momentumScore - a.momentumScore)
        .slice(0, count)
        .map((ticker) => ticker.name);

    // Offense: top tickers by buying ratio (100%: 6, 50%: 3, 0%: 0)
    const highScoreTickers = findBestMomentumScoreTickers(
      offenseSummary.tickers,
      (6 * buyingRatio) / 100,
    );

    // Deffense: the remaining ratio goes to the best ticker
    const deffenseTickers = findBestMomentumScoreTickers(
      deffenseSummary.tickers,
      deffenseRatio ? 1 : 0,
    );

    const allocations = [
      ...highScoreTickers.map((name) => ({
        name,
        ratio: this.utils.twoDecimalPoint(
          buyingRatio / highScoreTickers.length,
        ),
      })),
      ...deffenseTickers.map((name) => ({ name, ratio: deffenseRatio })),
    ];

    const momentumScoreInfo = this.getMomentumScoreForTickers(summary);

    let message = `[DAA Strategy]\n`;
    message += `날짜: ${this.today}\n`;
    message += `기준일: ${this.getBaseDate(summary)} (월말 종가)\n\n`;
    message += `${canarySummary.tickers.length}개의 카나리아 자산 중 모멘텀 스코어 수치가 Plus인 종목의 개수는 ${plusMomentumScoreInCanary.length}입니다.\n`;
    message += `공격 자산 매수 금액 비율: ${buyingRatio}%\n`;
    message += `공격 자산 중 모멘텀 스코어 상위 ${
      highScoreTickers.length
    }개 종목: ${
      highScoreTickers.length ? highScoreTickers : '구매 종목 없음'
    }\n`;
    message += `안전 자산 매수 금액 비율: ${deffenseRatio}%\n`;
    message += `안전 자산 중 구매 종목: ${
      deffenseTickers.length ? deffenseTickers : '구매 종목 없음'
    }\n`;
    message += `종목별 매수 금액 비율: ${allocations
      .map(({ name, ratio }) => `${name} ${ratio}%`)
      .join(', ')}\n\n`;
    message += `All DAA tickers 모멘텀 스코어 정보\n\n`;
    momentumScoreInfo.forEach((ticker) => {
      message += `${ticker.name}[${ticker.description}]: ${ticker.momentumScore}\n`;
    });

    const meta = {
      buyingRatio,
      deffenseRatio,
      highScoreTickers,
      deffenseTickers,
      allocations,
      momentumScoreInfo,
    };

    return { message, meta };
  }
}
