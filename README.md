# Motivation

2020년 코로나, 2022년 우-러 전쟁을 통해서 자산분배의 중요성을 몸소 느낀뒤 강환국 작가의 [거인의 포트폴리오](http://www.kyobobook.co.kr/product/detailViewKor.laf?ejkGb=KOR&mallGb=KOR&barcode=9791190977432&orderClick=LEa&Kc=)라는 책을 읽고 영감을 받아 만들게 되었습니다.  
책에서 소개하는 여러 전략중 [VAA](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)전략과 [DAA](https://allocatesmartly.com/ilya-kipnis-defensive-adaptive-asset-allocation/) 전략을 사용하고자 합니다.

## [VAA Strategy](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)

- 공격자산: SPY(S&P500), VEA(선진국), VWO(개도국), AGG(미국 혼합채권)
- 안전자산: SHY(미국단기채), IEF(중기채), LQD(회사채)
- 4개의 공격자산중 모멘텀 스코어가 가장 높은 1개 자산을 산다
- 4개의 공격 자산 중 하나라도 모멘텀스코어가 -면 안전자산으로
- 안전 자산중 모멘텀 스코어가 가장 높은 자산을 산다.

## [DAA Strategy](https://allocatesmartly.com/ilya-kipnis-defensive-adaptive-asset-allocation/)

- 카나리아: BND(미국 혼합 채권), VWO(개도국)
- 공격 자산: SPY(S&P500), IWM(러셀 2000), QQQ(나스닥), VGK(유럽), EWJ(일본), VWO(개도국), VNQ(리츠), GSG(원자재), GLD(금), TLT(미국 장기채), HYG(하이일드채권), LQD(회사채)
- 안전 자산: SHY(미국단기채), IEF(미국중기채), LQD(회사채)
- 12개 공격 자산, 모멘텀스코어가 제일 높은 6개의 자산을 삽니다.
- 카나리아 자산으로 공격형 자산 비중 결정(2: 100%, 1: 50%, 0: 0%);

## [Momentum score](https://ycharts.com/glossary/terms/momentum_fractile)

```
(12 * (p0 / p21 – 1)) + (4 * (p0 / p63 – 1)) + (2 * (p0 / p126 – 1)) + (p0 / p252 – 1)
```
# Run in Telegram with bot

![example.png](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/a9df9d42-bff8-4e9f-908c-4b88e4397ea0/%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB%E1%84%89%E1%85%A3%E1%86%BA_2022-10-04_%E1%84%8B%E1%85%A9%E1%84%92%E1%85%AE_6.09.43.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20221004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20221004T090958Z&X-Amz-Expires=86400&X-Amz-Signature=ac8bed7577e96006db8eb169c873182c2474a012ae4ad99969b3c6f0deafd2a5&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22%25E1%2584%2589%25E1%2585%25B3%25E1%2584%258F%25E1%2585%25B3%25E1%2584%2585%25E1%2585%25B5%25E1%2586%25AB%25E1%2584%2589%25E1%2585%25A3%25E1%2586%25BA%25202022-10-04%2520%25E1%2584%258B%25E1%2585%25A9%25E1%2584%2592%25E1%2585%25AE%25206.09.43.png%22&x-id=GetObject)

# Feature

## 1. Retry func
```JS
  const tickerData = await this.utils.retry(5, () =>
    this.financeApi.getHistoricalPrice(ticker),
  );
```

## 2. Cached ticker Data base on database
```JS
  if (tickerData) {
    await this.tickersService.createTicker({
      date: today,
      ticker,
      raw: tickerData as any,
    });
  }
```

## 3. Momentum Score calculator
```JS
return rawData.reduce<QuarterlyOutline[]>(
  (outlines, raw, index, origin) => {
    if (index === 0) return outlines;
    const yesterdayOverview = origin[0];

    const returnComparedWithYesterday =
      (yesterdayOverview.close / raw.close) * 100 - 100;

    const rateOfRetrun = this.utils.twoDecimalPoint(
      returnComparedWithYesterday,
    );

    // Quarterly Weight
    const quarterlyWeightedValues = {
      monthAgo: 12,
      threeMonthsAgo: 4,
      sixMonthsAgo: 2,
      yearAgo: 1,
    } as const

    const weightedValues = Object.values(quarterlyWeightedValues);
    const weightedValue = weightedValues[index - 1];

    const outline = {
      from: raw.date,
      to: yesterdayOverview.date,
      rateOfRetrun,
      adjustedReturn: this.utils.twoDecimalPoint(
        rateOfRetrun * weightedValue,
      ), // Adjustment value to take advantage of Momentum
    };

    return outlines.concat(outline);
  },
  [],
);
```

# Stack

## Frontend
 - nextJS

## Backend
 - NestJS
 - Fastify
 - Prisma

# Milestone
- [X] Ticker별 데이터 불러오기
- [X] Ticker별 데이터 정리(outline)
- [X] Outline 기반 모멘텀 스코어 계산하기
- [X] 모멘텀 스코어 기반 텔레그램에 보낼 Report 만들기
- [ ] Docker
- [ ] AWS 배포
- [ ] 프론트엔드 구상하기

