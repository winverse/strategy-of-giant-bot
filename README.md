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
> Where p0 = the asset’s price at today’s close, p1 = the asset’s price at the close of the previous trading day and so on. 21, 63, 126 and 252 days correspond to 1, 3, 6 and 12 months.

# Run in Telegram

![example.png](https://camo.githubusercontent.com/9a86975f4d45648b849be7c78a8884995b53c058b2747213fbe59fdfdea88ff2/68747470733a2f2f73332e75732d776573742d322e616d617a6f6e6177732e636f6d2f7365637572652e6e6f74696f6e2d7374617469632e636f6d2f33336331643632322d343962382d343939372d396365612d6532666437343635313964372f696d616765732e706e673f582d416d7a2d416c676f726974686d3d415753342d484d41432d53484132353626582d416d7a2d436f6e74656e742d5368613235363d554e5349474e45442d5041594c4f414426582d416d7a2d43726564656e7469616c3d414b49415437334c324734354549505433583435253246323032323130303425324675732d776573742d322532467333253246617773345f7265717565737426582d416d7a2d446174653d3230323231303034543130313134355a26582d416d7a2d457870697265733d383634303026582d416d7a2d5369676e61747572653d6431303730616532363463316461663764623735653263353534663339623462653764393862383566303732386434623130336334656631353563316535326626582d416d7a2d5369676e6564486561646572733d686f737426726573706f6e73652d636f6e74656e742d646973706f736974696f6e3d66696c656e616d65253230253344253232696d616765732e706e6725323226782d69643d4765744f626a656374)

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

