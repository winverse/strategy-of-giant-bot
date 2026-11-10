import { findGroup, topByScore } from '#strategy/allocation/select';
import type { MomentumScoreSummary } from '#strategy/strategy.types';

export const allocateVAA = (summary: MomentumScoreSummary[]) => {
  const offense = findGroup(summary, 'offense');
  const defense = findGroup(summary, 'defense');

  const minusOffenseTickers = offense.filter(
    (ticker) => ticker.momentumScore < 0,
  );

  // Any offense score below 0 switches the whole buy to defense
  const isDefensive = minusOffenseTickers.length > 0;

  const [selectedTicker] = topByScore(isDefensive ? defense : offense, 1);

  return {
    offenseCount: offense.length,
    minusOffenseCount: minusOffenseTickers.length,
    isDefensive,
    selectedTicker,
  };
};

export type VAAAllocation = ReturnType<typeof allocateVAA>;
