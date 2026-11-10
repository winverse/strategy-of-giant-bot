**English** | [한국어](README.ko.md)

# Motivation

The COVID-19 crash in 2020 and the Russia–Ukraine war in 2022 showed me firsthand how much asset allocation matters. I built this after reading Kang Hwan-guk's book [The Giant's Portfolio (거인의 포트폴리오)](http://www.kyobobook.co.kr/product/detailViewKor.laf?ejkGb=KOR&mallGb=KOR&barcode=9791190977432&orderClick=LEa&Kc=).  
Of the strategies introduced in the book, this project uses [VAA](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/) and [DAA](https://indexswingtrader.blogspot.com/2018/07/announcing-defensive-asset-allocation.html).

## [VAA Strategy](https://allocatesmartly.com/vigilant-asset-allocation-dr-wouter-keller-jw-keuning/)

- Offensive assets: SPY (S&P 500), VEA (developed markets), VWO (emerging markets), AGG (US aggregate bonds)
- Defensive assets: SHY (US short-term Treasuries), IEF (intermediate-term Treasuries), LQD (corporate bonds)
- Buy the one offensive asset with the highest momentum score.
- If any of the four offensive assets has a negative momentum score, switch to defensive assets.
- Among the defensive assets, buy the one with the highest momentum score.

## [DAA Strategy](https://indexswingtrader.blogspot.com/2018/07/announcing-defensive-asset-allocation.html)

- Canary assets: BND (US aggregate bonds), VWO (emerging markets)
- Offensive assets: SPY (S&P 500), IWM (Russell 2000), QQQ (Nasdaq), VGK (Europe), EWJ (Japan), VWO (emerging markets), VNQ (REITs), GSG (commodities), GLD (gold), TLT (US long-term Treasuries), HYG (high-yield bonds), LQD (corporate bonds)
- Defensive assets: SHY (US short-term Treasuries), IEF (US intermediate-term Treasuries), LQD (corporate bonds)
- The canary assets set the offensive allocation, by how many have a positive momentum score (2: 100%, 1: 50%, 0: 0%).
- Split the offensive allocation equally among the top offensive assets by momentum score (100%: top 6, 50%: top 3).
- Put the rest in the defensive asset with the highest momentum score.

## [Momentum score](https://ycharts.com/glossary/terms/momentum_fractile)

```
(12 * (p0 / p21 – 1)) + (4 * (p0 / p63 – 1)) + (2 * (p0 / p126 – 1)) + (p0 / p252 – 1)
```
> Where p0 = the asset’s price at today’s close, p1 = the asset’s price at the close of the previous trading day and so on. 21, 63, 126 and 252 days correspond to 1, 3, 6 and 12 months.

This project uses month-end, dividend-adjusted closing prices, and rebalances at the end of every month.

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
 - Bun (runtime, package manager, test runner)
 - Turborepo: `apps/server`, `apps/web`
 - TypeScript 7, Biome

# Development

```sh
bun install
bun run dev        # server and web (Turborepo)
bun run test       # server tests
bun run build      # dist/main.js and the Next.js build
bun run check      # Biome
```

The server reads `apps/server/config/development.ts` (gitignored; copy `config/default.ts` and fill it in).

# Server structure

`apps/server/src` is grouped by domain.

- `strategy/`: momentum scores, VAA/DAA allocation, the Telegram report, HTTP routes and the schedule
- `price/`: Equibles prices and their daily cache
- `config/`, `database/`, `logger/`, `telegram/`, `common/`: code that every domain shares

Rules:

- Inside a domain, subfolders (`allocation/`, `momentum/`, `report/`) hold plain functions only: no dependency injection, database, API calls or current-time reads. Nest files (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.client.ts`) sit directly in the domain folder.
- A domain uses another domain only through its service and types.
- Unit tests sit next to the code (`vaa.ts` → `vaa.spec.ts`). HTTP tests and shared fixtures live in `apps/server/test/`. Test descriptions are written in Korean.
- `bun test` runs every test. `bun run test:unit` and `bun run test:e2e` run one kind.

# Milestone
- [X] Fetch data for each ticker
- [X] Organize data for each ticker (outline)
- [X] Calculate momentum scores from the outline
- [X] Build the Telegram report from momentum scores
- [ ] Docker
- [ ] Deploy to AWS
- [ ] Plan the frontend

