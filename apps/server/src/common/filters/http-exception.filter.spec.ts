import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '#common/filters/http-exception.filter';
import type { LoggerService } from '#logger/logger.service';
import type { TelegramService } from '#telegram/telegram.service';

const CAUSE = "undefined is not an object (evaluating 'base.adjustedClose')";

// filter.catch가 받는 Fastify 요청과 응답 대역
const createHost = () => {
  const reply = { status: mock(() => reply), send: mock(() => reply) };
  const request = { method: 'GET', url: '/api/v1/assets', query: {} };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;
  return { host, reply };
};

const errorChat = { sendMessage: mock() };
const filter = new HttpExceptionFilter(
  { error: mock() } as unknown as LoggerService,
  errorChat as unknown as TelegramService,
);

// bun test는 NODE_ENV=test로 돈다. 운영 환경 사례만 잠시 바꾼다
const testEnv = process.env.NODE_ENV;
const asProduction = () => {
  process.env.NODE_ENV = 'production';
};

describe('HttpExceptionFilter', () => {
  spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    process.env.NODE_ENV = testEnv;
    errorChat.sendMessage.mockClear();
  });

  it('개발 환경: 일반 오류를 감싼 500은 원래 오류 문구를 JSON으로 답한다', () => {
    const { host, reply } = createHost();

    filter.catch(new InternalServerErrorException(new TypeError(CAUSE)), host);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      statusCode: 500,
      message: CAUSE,
      error: undefined,
    });
  });

  it('운영 환경: 500은 원인을 숨기고, 오류 알림에는 원래 문구를 남긴다', () => {
    asProduction();
    const { host, reply } = createHost();

    filter.catch(new InternalServerErrorException(new TypeError(CAUSE)), host);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      error: undefined,
    });
    expect(errorChat.sendMessage.mock.calls[0]?.[1]).toContain(CAUSE);
  });

  it.each([
    ['개발', () => {}, CAUSE],
    ['운영', asProduction, 'Internal server error'],
  ])(
    '%s 환경: HttpException이 아닌 오류도 500 JSON으로 답한다',
    (_, setEnv, message) => {
      setEnv();
      const { host, reply } = createHost();

      filter.catch(new TypeError(CAUSE), host);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ statusCode: 500, message });
    },
  );

  it.each([
    ['개발', () => {}],
    ['운영', asProduction],
  ])('%s 환경: 400은 Nest가 만든 본문 그대로 답한다', (_, setEnv) => {
    setEnv();
    const { host, reply } = createHost();

    filter.catch(new BadRequestException('BAD_REQUEST'), host);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'BAD_REQUEST',
      error: 'Bad Request',
    });
  });
});
