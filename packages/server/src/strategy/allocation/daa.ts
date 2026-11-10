import { twoDecimalPoint } from '#common/utils/number';
import { findGroup, topByScore } from '#strategy/allocation/select';
import type { MomentumScoreSummary } from '#strategy/strategy.types';

export const allocateDAA = (summary: MomentumScoreSummary[]) => {
  const canary = findGroup(summary, 'canary');
  const offense = findGroup(summary, 'offense');
  const defense = findGroup(summary, 'defense');

  const plusCanaryCount = canary.filter(
    (ticker) => ticker.momentumScore > 0,
  ).length;

  // Offense share by canaries scoring above 0 (2: 100%, 1: 50%, 0: 0%)
  const offenseRatio = plusCanaryCount * 0.5 * 100;
  const defenseRatio = 100 - offenseRatio;

  // Offense: top tickers by offense share (100%: 6, 50%: 3, 0%: 0)
  const offenseTickers = topByScore(offense, (6 * offenseRatio) / 100).map(
    (ticker) => ticker.name,
  );

  // Defense: the remaining share goes to the best ticker
  const defenseTickers = topByScore(defense, defenseRatio ? 1 : 0).map(
    (ticker) => ticker.name,
  );

  const allocations = [
    ...offenseTickers.map((name) => ({
      name,
      ratio: twoDecimalPoint(offenseRatio / offenseTickers.length),
    })),
    ...defenseTickers.map((name) => ({ name, ratio: defenseRatio })),
  ];

  return {
    canaryCount: canary.length,
    plusCanaryCount,
    offenseRatio,
    defenseRatio,
    offenseTickers,
    defenseTickers,
    allocations,
  };
};

export type DAAAllocation = ReturnType<typeof allocateDAA>;
