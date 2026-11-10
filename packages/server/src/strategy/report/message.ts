import { format } from 'date-fns';
import type { DAAAllocation } from '#strategy/allocation/daa';
import type { VAAAllocation } from '#strategy/allocation/vaa';
import type { MomentumScoreSummary } from '#strategy/strategy.types';
import { describeTicker } from '#strategy/tickers';

const formatToday = (today: Date) => format(today, 'yy년 MM월 dd일');

// Every outline ends at the same base month-end
const baseDate = (summary: MomentumScoreSummary[]) =>
  summary
    .flatMap((group) => group.tickers)
    .map((ticker) => ticker.outline[0]?.to)
    .find((date) => date !== undefined);

// Each ticker once (DAA lists VWO and LQD in two groups), best score first
const scoresOfAllTickers = (summary: MomentumScoreSummary[]) =>
  summary
    .flatMap((group) => group.tickers)
    .filter(
      (ticker, index, tickers) =>
        tickers.findIndex(({ name }) => name === ticker.name) === index,
    )
    .map(({ name, momentumScore }) => ({
      name,
      momentumScore,
      description: describeTicker(name),
    }))
    .sort((a, b) => b.momentumScore - a.momentumScore);

const toMessage = (lines: string[]) => `${lines.join('\n')}\n`;

export const vaaMessage = (
  summary: MomentumScoreSummary[],
  vaa: VAAAllocation,
  today: Date,
) =>
  toMessage([
    '[VAA Strategy]',
    `날짜: ${formatToday(today)}`,
    `기준일: ${baseDate(summary)} (월말 종가)`,
    '',
    `${vaa.offenseCount}개의 공격 자산 중 모멘텀 스코어 수치가 Minus인 종목의 개수는 ${vaa.minusOffenseCount}입니다.`,
    `${vaa.isDefensive ? '안전' : '공격'}자산 중 구매 종목은 ${vaa.selectedTicker.name} 이며`,
    `모멘텀 스코어 점수는 ${vaa.selectedTicker.momentumScore} 입니다.`,
    '',
    'All VAA tickers 모멘텀 스코어 정보',
    '',
    ...scoresOfAllTickers(summary).map(
      (ticker) =>
        `${ticker.name}(${ticker.description}): ${ticker.momentumScore}`,
    ),
  ]);

export const daaMessage = (
  summary: MomentumScoreSummary[],
  daa: DAAAllocation,
  today: Date,
) =>
  toMessage([
    '[DAA Strategy]',
    `날짜: ${formatToday(today)}`,
    `기준일: ${baseDate(summary)} (월말 종가)`,
    '',
    `${daa.canaryCount}개의 카나리아 자산 중 모멘텀 스코어 수치가 Plus인 종목의 개수는 ${daa.plusCanaryCount}입니다.`,
    `공격 자산 매수 금액 비율: ${daa.offenseRatio}%`,
    `공격 자산 중 모멘텀 스코어 상위 ${daa.offenseTickers.length}개 종목: ${
      daa.offenseTickers.length
        ? daa.offenseTickers.join(',')
        : '구매 종목 없음'
    }`,
    `안전 자산 매수 금액 비율: ${daa.defenseRatio}%`,
    `안전 자산 중 구매 종목: ${
      daa.defenseTickers.length
        ? daa.defenseTickers.join(',')
        : '구매 종목 없음'
    }`,
    `종목별 매수 금액 비율: ${daa.allocations
      .map(({ name, ratio }) => `${name} ${ratio}%`)
      .join(', ')}`,
    '',
    'All DAA tickers 모멘텀 스코어 정보',
    '',
    ...scoresOfAllTickers(summary).map(
      (ticker) =>
        `${ticker.name}[${ticker.description}]: ${ticker.momentumScore}`,
    ),
  ]);
