import { TickerSummary } from './../../module/assets/assets.interface';
import { PrintMessageResult } from './messages.interface';
import { MomentumScoreSummary } from '@module/assets/assets.interface';
import { Injectable } from '@nestjs/common';
import { UtilsService } from '@provider/utils';

@Injectable()
export class MessagesService {
  constructor(private readonly utils: UtilsService) {}
  get today() {
    return this.utils.today('yy년 MM월 dd일');
  }
  printMessageForVAAStarategy(
    summary: MomentumScoreSummary[],
  ): PrintMessageResult {
    const offense = summary.find((data) => data.group === 'offense');
    const deffense = summary.find((data) => data.group === 'deffense');

    const minusMomentumScoreInOffense = offense.tickers.filter(
      (ticker) => ticker.totalMomentumScore < 0,
    );

    const isMinusMomentumScoreInOffense =
      minusMomentumScoreInOffense.length > 0;

    const findBestMomentumSocreTicker = (data: TickerSummary[]) =>
      data
        .sort((a, b) => b.totalMomentumScore - a.totalMomentumScore)
        .slice(0, 1);

    const selectedTickerData = findBestMomentumSocreTicker(
      isMinusMomentumScoreInOffense ? deffense.tickers : offense.tickers,
    )[0];

    let message = `[VAA Strategy] - ${this.today}\n`;
    message += `${offense.tickers.length}개의 공격 자산 중 모멘텀 스코어 수치가 Minus인 종목의 개수는 ${minusMomentumScoreInOffense.length}입니다.\n`;
    message += `${
      isMinusMomentumScoreInOffense ? '안전' : '공격'
    }자산 중 구매 종목은 ${selectedTickerData.name} 이며\n`;
    message += `모멘텀 스코어 점수는 ${selectedTickerData.totalMomentumScore} 입니다.`;

    const meta = {
      isMinusMomentumScoreInOffense,
      selectedTickerData,
    };
    throw new Error('Hello');
    return { message, meta };
  }
  printMessageForDAAStarategy(
    summary: MomentumScoreSummary[],
  ): PrintMessageResult {
    const canary = summary.find((outline) => outline.group === 'canary');
    const offense = summary.find((outline) => outline.group === 'offense');
    const deffense = summary.find((outline) => outline.group === 'deffense');

    const buyingRatio =
      canary.tickers.filter((ticker) => ticker.totalMomentumScore > 0).length *
      0.5 *
      100;

    const tickers = [...offense.tickers, ...deffense.tickers];

    const highScoreTickers = tickers
      .sort((a, b) => b.totalMomentumScore - a.totalMomentumScore)
      .slice(0, 6)
      .map((data) => data.name);

    let message = `[DAA Strategy] - ${this.today}\n`;
    message += `자산 중, 매수 금액 비율: ${buyingRatio}%\n`;
    message += `모멘텀 스코어 상위 6개 종목: ${
      buyingRatio ? highScoreTickers : '구매 종목 없음'
    }`;

    const meta = {
      buyingRatio,
      highScoreTickers: buyingRatio ? highScoreTickers : [],
    };

    return { message, meta };
  }
}
