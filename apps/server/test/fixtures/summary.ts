import type { MomentumScoreSummary } from '#strategy/strategy.types';

// { 그룹: { 종목: 모멘텀 점수 } } 로 점수표를 만든다
export const summaryOf = (
  scoresByGroup: Record<string, Record<string, number>>,
): MomentumScoreSummary[] =>
  Object.entries(scoresByGroup).map(([group, scores]) => ({
    group,
    tickers: Object.entries(scores).map(([name, momentumScore]) => ({
      name,
      momentumScore,
      outline: [
        {
          from: '2026-09-30',
          to: '2026-10-30',
          rateOfReturn: 0,
          adjustedReturn: 0,
        },
      ],
    })),
  }));
