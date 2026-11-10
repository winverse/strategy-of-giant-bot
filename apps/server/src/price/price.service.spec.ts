import { describe, expect, it, mock } from 'bun:test';
import { InternalServerErrorException } from '@nestjs/common';
import { EquiblesClient, EquiblesError } from '#price/equibles.client';
import { PriceRepository } from '#price/price.repository';
import { PriceService } from '#price/price.service';
import { rawPrices } from '#test/fixtures/prices';

type Row = { ticker: string; date: string; raw: unknown };

// DB 대신 쓰는 메모리 테이블. 조회는 실제 DB처럼 한 틱 늦게 끝난다
const createRepository = () => {
  const rows: Row[] = [];
  const repository = {
    rows,
    find: mock(async (ticker: string, date: string) => {
      await Promise.resolve();
      return rows.find((row) => row.ticker === ticker && row.date === date);
    }),
    create: mock(async (row: Row) => {
      rows.push(row);
      return row;
    }),
  };
  return repository;
};

const createService = (
  getHistoricalPrices: (ticker: string) => Promise<unknown>,
) => {
  const repository = createRepository();
  const client = { getHistoricalPrices: mock(getHistoricalPrices) };
  const service = new PriceService(
    client as unknown as EquiblesClient,
    repository as unknown as PriceRepository,
  );
  return { service, repository, client };
};

describe('PriceService.getPrices', () => {
  it('같은 종목을 동시에 찾으면 Equibles는 한 번만 부르고 캐시도 한 줄만 쓴다', async () => {
    const { service, repository, client } = createService(
      async () => rawPrices,
    );

    // DAA는 VWO를 카나리아와 공격 자산 양쪽에서 동시에 찾는다
    const [a, b] = await Promise.all([
      service.getPrices('VWO'),
      service.getPrices('VWO'),
    ]);

    expect(a).toEqual(rawPrices);
    expect(b).toEqual(rawPrices);
    expect(client.getHistoricalPrices).toHaveBeenCalledTimes(1);
    expect(repository.rows.map(({ ticker }) => ticker)).toEqual(['VWO']);
  });

  it('끝난 조회는 다시 쓰지 않고, 그다음 요청은 캐시에서 읽는다', async () => {
    const { service, client } = createService(async () => rawPrices);

    await service.getPrices('SPY');
    await service.getPrices('SPY');

    expect(client.getHistoricalPrices).toHaveBeenCalledTimes(1);
  });

  it('일일 한도 초과(429)는 다시 시도하지 않고 바로 실패하며, 캐시에 아무것도 쓰지 않는다', async () => {
    const { service, repository, client } = createService(async () => {
      throw new EquiblesError('GSG', 429, 'Request failed');
    });

    const failure = service.getPrices('GSG');

    await expect(failure).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(client.getHistoricalPrices).toHaveBeenCalledTimes(1);
    expect(repository.rows).toEqual([]);
  });

  it('실패한 조회는 남지 않아서, 다음 요청은 다시 Equibles를 부른다', async () => {
    let fail = true;
    const { service, client } = createService(async () => {
      if (fail) throw new EquiblesError('GSG', 429, 'Request failed');
      return rawPrices;
    });

    await expect(service.getPrices('GSG')).rejects.toThrow();
    fail = false;

    expect(await service.getPrices('GSG')).toEqual(rawPrices);
    expect(client.getHistoricalPrices).toHaveBeenCalledTimes(2);
  });
});
