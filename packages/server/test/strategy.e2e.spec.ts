import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from 'bun:test';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { PrismaService } from '#database/prisma.service';
import { EquiblesClient } from '#price/equibles.client';
import { TelegramService } from '#telegram/telegram.service';
import { rawPrices } from '#test/fixtures/prices';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

type CachedPrice = { ticker: string; date: string; raw: unknown };

// DB 대신 쓰는 메모리 테이블
const createFakePrisma = () => {
  const rows: CachedPrice[] = [];
  return {
    tickers: {
      findFirst: async ({ where }: { where: CachedPrice }) =>
        rows.find(
          (row) => row.ticker === where.ticker && row.date === where.date,
        ) ?? null,
      create: async ({ data }: { data: CachedPrice }) => {
        rows.push(data);
        return data;
      },
    },
  };
};

describe('/api/v1/assets (HTTP)', () => {
  const equibles = { getHistoricalPrices: mock(async () => rawPrices) };
  const telegram = {
    sendMessage: mock(async (_room: string, _message: string) => {}),
  };
  let app: NestFastifyApplication;

  const get = (url: string) => app.inject({ method: 'GET', url });

  beforeAll(async () => {
    // 가격 데이터(2026-11-09까지)의 다음 날 낮. 예약 작업은 다음 날 아침이라 돌지 않는다
    setSystemTime(new Date(2026, 10, 10, 12));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(createFakePrisma())
      .overrideProvider(EquiblesClient)
      .useValue(equibles)
      .overrideProvider(TelegramService)
      .useValue(telegram)
      .compile();

    app = setupApp(
      moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      ),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    setSystemTime();
  });

  it('GET: 전략의 그룹별 종목 점수를 돌려준다 (전략 이름은 대소문자 무관)', async () => {
    const res = await get('/api/v1/assets?strategy=vaa');
    const body = res.json();

    expect(res.statusCode).toBe(200);
    expect(body.map(({ group }: { group: string }) => group)).toEqual([
      'offense',
      'defense',
    ]);
    expect(body[0].tickers.map(({ name }: { name: string }) => name)).toEqual([
      'SPY',
      'VEA',
      'VWO',
      'AGG',
    ]);
    expect(Object.keys(body[0].tickers[0].outline[0])).toEqual([
      'from',
      'to',
      'rateOfReturn',
      'adjustedReturn',
    ]);
  });

  it('GET reports: 텔레그램에 보낼 글을 그대로 돌려준다', async () => {
    const res = await get('/api/v1/assets/reports?strategy=DAA');

    expect(res.statusCode).toBe(200);
    expect(res.body).toStartWith('[DAA Strategy]\n');
    expect(res.body).toContain('기준일: 2026-10-30 (월말 종가)');
  });

  it.each([
    ['전략이 없음', ''],
    ['전략이 빈 값', '?strategy='],
    ['모르는 전략', '?strategy=gtaa'],
  ])('GET: %s이면 400', async (_, query) => {
    const res = await get(`/api/v1/assets${query}`);

    expect(res.statusCode).toBe(400);
    expect(res.json<Record<string, unknown>>()).toEqual({
      statusCode: 400,
      message: 'BAD_REQUEST',
      error: 'Bad Request',
    });
  });

  it('가격은 종목마다 하루 한 번만 Equibles에서 받고, 그다음은 캐시를 쓴다', async () => {
    await get('/api/v1/assets?strategy=VAA');
    const calls = equibles.getHistoricalPrices.mock.calls.length;

    await get('/api/v1/assets?strategy=VAA');

    expect(equibles.getHistoricalPrices.mock.calls.length).toBe(calls);
  });

  it('POST: VAA와 DAA 리포트를 reading 방에 차례로 보낸다', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/assets' });

    expect(res.statusCode).toBe(201);
    expect(
      telegram.sendMessage.mock.calls.map(([room, message]) => [
        room,
        message.split('\n')[0],
      ]),
    ).toEqual([
      ['reading', '[VAA Strategy]'],
      ['reading', '[DAA Strategy]'],
    ]);
  });
});
