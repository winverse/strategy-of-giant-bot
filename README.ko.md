[English](README.md) | **한국어**

# Motivation

2020년 코로나, 2022년 우-러 전쟁을 통해서 자산분배의 중요성을 몸소 느낀뒤 강환국 작가의 [거인의 포트폴리오](http://www.kyobobook.co.kr/product/detailViewKor.laf?ejkGb=KOR&mallGb=KOR&barcode=9791190977432&orderClick=LEa&Kc=)라는 책을 읽고 영감을 받아 만들게 되었습니다.  
책에서 소개하는 여러 전략중 [VAA](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)전략과 [DAA](https://indexswingtrader.blogspot.com/2018/07/announcing-defensive-asset-allocation.html) 전략을 사용하고자 합니다.

## [VAA Strategy](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)

- 공격자산: SPY(S&P500), VEA(선진국), VWO(개도국), AGG(미국 혼합채권)
- 안전자산: SHY(미국단기채), IEF(중기채), LQD(회사채)
- 4개의 공격자산중 모멘텀 스코어가 가장 높은 1개 자산을 산다
- 4개의 공격 자산 중 하나라도 모멘텀스코어가 -면 안전자산으로
- 안전 자산중 모멘텀 스코어가 가장 높은 자산을 산다.

## [DAA Strategy](https://indexswingtrader.blogspot.com/2018/07/announcing-defensive-asset-allocation.html)

- 카나리아: BND(미국 혼합 채권), VWO(개도국)
- 공격 자산: SPY(S&P500), IWM(러셀 2000), QQQ(나스닥), VGK(유럽), EWJ(일본), VWO(개도국), VNQ(리츠), GSG(원자재), GLD(금), TLT(미국 장기채), HYG(하이일드채권), LQD(회사채)
- 안전 자산: SHY(미국단기채), IEF(미국중기채), LQD(회사채)
- 카나리아 자산으로 공격형 자산 비중 결정(2: 100%, 1: 50%, 0: 0%)
- 공격형 비중은 12개 공격 자산 중 모멘텀스코어 상위 자산에 똑같이 나눕니다(100%: 상위 6개, 50%: 상위 3개).
- 나머지 비중은 안전 자산 중 모멘텀 스코어가 가장 높은 자산을 삽니다.

## [Momentum score](https://ycharts.com/glossary/terms/momentum_fractile)

```
(12 * (p0 / p21 – 1)) + (4 * (p0 / p63 – 1)) + (2 * (p0 / p126 – 1)) + (p0 / p252 – 1)
```
> Where p0 = the asset’s price at today’s close, p1 = the asset’s price at the close of the previous trading day and so on. 21, 63, 126 and 252 days correspond to 1, 3, 6 and 12 months.

배당을 반영한 월말 종가로 계산하고, 매월 말에 리밸런싱합니다.

# Run in Telegram

![example.png](https://i.imgur.com/V0Dx3jo.png)

# Stack

## Frontend
 - Next.js 16 (App Router, React Compiler, Cache Components)
 - Panda CSS

## Backend
 - NestJS 12 on Fastify 5
 - Prisma 7 (PostgreSQL)

## Data
 - [Equibles](https://equibles.com): stock market data API

## Tooling
 - Bun (실행, 패키지 관리, 테스트)
 - Turborepo: `apps/server`, `apps/web`
 - TypeScript 7, Biome

# Development

```sh
bun install
bun run dev        # 서버와 웹 (Turborepo)
bun run test       # 서버 테스트
bun run build      # dist/main.js와 Next.js 빌드
bun run check      # Biome
```

서버는 `apps/server/config/development.ts`를 읽는다(gitignore됨. `config/default.ts`를 복사해 값을 채운다).

# Server structure

`apps/server/src`는 도메인별로 나눈다.

- `strategy/`: 모멘텀 점수, VAA·DAA 배분, 텔레그램 리포트, HTTP 경로, 예약 작업
- `price/`: Equibles 가격과 하루 단위 캐시
- `config/`, `database/`, `logger/`, `telegram/`, `common/`: 모든 도메인이 같이 쓰는 코드

규칙:

- 도메인 안의 하위 폴더(`allocation/`, `momentum/`, `report/`)에는 함수만 둔다. DI, DB, API 호출, 현재 시각 읽기는 넣지 않는다. Nest 파일(`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.client.ts`)은 도메인 폴더 바로 아래에 둔다.
- 다른 도메인의 코드는 그 도메인의 service와 타입으로만 쓴다.
- 단위 테스트는 코드 옆에 둔다(`vaa.ts` → `vaa.spec.ts`). HTTP 테스트와 공용 가짜 데이터는 `apps/server/test/`에 둔다. 테스트 설명은 한글로 쓴다.
- `bun test`는 모든 테스트를, `bun run test:unit`과 `bun run test:e2e`는 한쪽만 돌린다.

# Milestone
- [X] Ticker별 데이터 불러오기
- [X] Ticker별 데이터 정리(outline)
- [X] Outline 기반 모멘텀 스코어 계산하기
- [X] 모멘텀 스코어 기반 텔레그램에 보낼 Report 만들기
- [ ] Docker
- [ ] AWS 배포
- [ ] 프론트엔드 구상하기

