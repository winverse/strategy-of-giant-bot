# Motive

2020년 코로나, 2022년 우-러 전쟁을 통해서 자산분배의 중요성을 몸소 느낀뒤 강환국 작가의 [거인의 포트폴리오](http://www.kyobobook.co.kr/product/detailViewKor.laf?ejkGb=KOR&mallGb=KOR&barcode=9791190977432&orderClick=LEa&Kc=)라는 책을 읽고 영감을 받아 만들게 되었습니다.  
책에서 소개하는 여러 전략중 VAA전략과 DAA 전략을 사용하고자 합니다.

## [VAA Strategy](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)

- 공격자산: SPY(S&P500), VEA(선진국), VWO(개도국), AGG(미국 혼합채권)
- 안전자산: SHY(미국단기채), IEF(중기채), LQD(회사채)
- 4개의 공격자산중 모멘텀 스코어가 가장 높은 1개 자산을 산다
- 4개의 공격 자산 중 하나라도 모멘텀스코어가 -면 안전자산으로
- -(Minus)가 나오면 3개의 안전 자산중 모멘텀 스코어가 가장 높은 자산을 산다.

## [DAA Strategy](https://allocatesmartly.com/ilya-kipnis-defensive-adaptive-asset-allocation/)

- 카나리아: BND(미국 혼합 채권), VWO(개도국), KOSPI(한국)
- 공격 자산: SPY(S&P500), IWM(러셀 2000), QQQ(나스닥), VGK(유럽), EWJ(일본), VWO(개도국), VNQ(리츠), GSG(원자재), GLD(금), TLT(미국 장기채), HYG(하이일드채권), LQD(회사채)
- 안전 자산: SHY(미국단기채), IEF(미국중기채), LQD(회사채)
- 12개 공격 자산, 모멘텀스코어가 제일 높은 6개의 자산을 삽니다.
- 카나리아 자산으로 공격형 자산 비중 결정(3+: 100%, 2+: 66%, 1+: 33%, 0: 0%);

## [Momentum score](https://ycharts.com/glossary/terms/momentum_fractile)

```
(12 * (p0 / p21 – 1)) + (4 * (p0 / p63 – 1)) + (2 * (p0 / p126 – 1)) + (p0 / p252 – 1)
```
