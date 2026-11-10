import { describe, expect, it } from 'bun:test';
import { allocateDAA } from '#strategy/allocation/daa';
import { allocateVAA } from '#strategy/allocation/vaa';
import { daaMessage, vaaMessage } from '#strategy/report/message';
import { today } from '#test/fixtures/prices';
import { summaryOf } from '#test/fixtures/summary';

describe('vaaMessage', () => {
  const summary = summaryOf({
    offense: { SPY: 18.2, VEA: -5.3, VWO: 1.2, AGG: 25.7 },
    defense: { SHY: 16.8, IEF: 31.9, LQD: -21.9 },
  });
  const message = vaaMessage(summary, allocateVAA(summary), today);

  it('날짜, 기준일, 산 종목을 적는다', () => {
    expect(message).toStartWith(
      '[VAA Strategy]\n날짜: 26년 11월 10일\n기준일: 2026-10-30 (월말 종가)\n',
    );
    expect(message).toContain(
      '4개의 공격 자산 중 모멘텀 스코어 수치가 Minus인 종목의 개수는 1입니다.',
    );
    expect(message).toContain('안전자산 중 구매 종목은 IEF 이며');
  });

  it('모든 종목의 점수를 높은 순으로 한 번씩 적는다', () => {
    const scoreLines = message.split('\n\n').at(-1)?.trim().split('\n');

    expect(scoreLines?.[0]).toBe('IEF(미국 중기(7~10년) 채권): 31.9');
    expect(scoreLines).toHaveLength(7);
  });
});

describe('daaMessage', () => {
  const summary = summaryOf({
    canary: { BND: 27.6, VWO: -106 },
    offense: { SPY: 18.2, VWO: -106, GSG: 185.9, TLT: 61, VNQ: 48.5 },
    defense: { SHY: 16.8, IEF: 31.9 },
  });
  const message = daaMessage(summary, allocateDAA(summary), today);

  it('기준일과 종목별 비중을 적는다', () => {
    expect(message).toContain('기준일: 2026-10-30 (월말 종가)');
    expect(message).toContain(
      '공격 자산 중 모멘텀 스코어 상위 3개 종목: GSG,TLT,VNQ',
    );
    expect(message).toContain(
      '종목별 매수 금액 비율: GSG 16.67%, TLT 16.67%, VNQ 16.67%, IEF 50%',
    );
  });

  it('두 그룹에 있는 종목(VWO)은 점수 목록에 한 번만 적는다', () => {
    expect(message.match(/^VWO\[/gm)).toHaveLength(1);
  });
});
