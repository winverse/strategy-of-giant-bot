import { eachDayOfInterval, format, isWeekend } from 'date-fns';
import type { RawHistoricalPrice } from '#price/price.types';

// 평일만, Equibles API처럼 최신 날짜가 먼저 온다.
// close는 늘 같아서 모멘텀 점수는 adjustedClose로만 생긴다.
export const rawPrices: RawHistoricalPrice[] = eachDayOfInterval({
  start: new Date(2025, 8, 1),
  end: new Date(2026, 10, 9),
})
  .filter((date) => !isWeekend(date))
  .map((date, index) => ({
    date: format(date, 'yyyy-MM-dd'),
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    adjustedClose: 100 + index,
    volume: 0,
  }))
  .reverse();

export const priceOn = (date: string) =>
  rawPrices.find((price) => price.date === date)?.adjustedClose ?? Number.NaN;

// 위 가격의 다음 날 아침. 테스트를 돌리는 곳의 시간대와 관계없이 11월 10일이다
export const today = new Date(2026, 10, 10, 6);
