import { describe, expect, it } from 'bun:test';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  EquiblesError,
  isTransientEquiblesError,
  toEquiblesError,
} from '#price/equibles.client';

const SECRET = 'eq_secret_for_test';

// axios가 응답 실패로 만드는 오류. 요청 설정에 인증 헤더가 들어 있다
const axiosFailure = (status?: number) => {
  const config = {
    headers: new AxiosHeaders({ Authorization: `Bearer ${SECRET}` }),
  };
  const response = status
    ? {
        status,
        statusText: '',
        headers: {},
        config,
        data: {},
      }
    : undefined;
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    { _header: `Authorization: Bearer ${SECRET}` },
    response,
  );
};

describe('toEquiblesError', () => {
  it('axios 오류를 상태 코드만 남긴 오류로 바꿔서, 로그에 API 키가 찍히지 않는다', () => {
    const error = toEquiblesError('GSG', axiosFailure(429));

    expect(error).toBeInstanceOf(EquiblesError);
    expect(error).toMatchObject({ ticker: 'GSG', status: 429 });
    expect((error as Error).message).toBe(
      'Equibles GSG: Request failed with status code 429',
    );
    expect(Bun.inspect(error)).not.toContain(SECRET);
  });

  it('axios 오류가 아니면 그대로 둔다', () => {
    const error = new Error('NO_HISTORICAL_DATA_FROM_EQUIBLES');

    expect(toEquiblesError('GSG', error)).toBe(error);
  });
});

describe('isTransientEquiblesError', () => {
  it.each([
    ['응답 없음 (네트워크, 시간 초과)', undefined, true],
    ['서버 오류 503', 503, true],
    ['일일 한도 초과 429', 429, false],
    ['인증 실패 401', 401, false],
  ])('%s → 다시 시도 %p', (_, status, expected) => {
    expect(
      isTransientEquiblesError(new EquiblesError('GSG', status, 'x')),
    ).toBe(expected);
  });

  it('Equibles 오류가 아니면 다시 시도하지 않는다', () => {
    expect(isTransientEquiblesError(new Error('NO_HISTORICAL_DATA'))).toBe(
      false,
    );
  });
});
