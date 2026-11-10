import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LoggerService } from '#logger/logger.service';
import { TelegramService } from '#telegram/telegram.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

const INTERNAL_SERVER_ERROR = 'Internal server error';

// What a client sees as the message. In production a 5xx hides the cause; the
// log and the error chat keep the original. Elsewhere the original shows, to
// make development easier.
const clientMessage = (statusCode: number, message: unknown) =>
  statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? INTERNAL_SERVER_ERROR
    : message;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly telegramService: TelegramService,
  ) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp(); // basic
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const exceptionResponse: any = exception.getResponse();

      // The exception's own status. Its response can be a wrapped error with
      // no status at all (new InternalServerErrorException(error)).
      const statusCode = exception.getStatus();
      const message = exceptionResponse?.message;
      const error = exceptionResponse?.error;

      const log = `
        from: giant's-strategy-bot
        method: ${request.method}
        url: ${request.url}
        statusCode: ${statusCode}
        message: ${message}
        body: ${JSON.stringify(request.body, null, 4) || {}}
        params: ${JSON.stringify(request.params, null, 4)}
        query: ${JSON.stringify(Object.assign({}, request.query), null, 4)}
      `;

      if (process.env.NODE_ENV === 'production') {
        this.telegramService.sendMessage('error', log);
        this.logger.error(exception);
      }

      console.error(exceptionResponse);

      reply.status(statusCode).send({
        statusCode,
        message: clientMessage(statusCode, message),
        error,
      });
    } else {
      console.error(exception);

      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        exception instanceof Error ? exception.message : INTERNAL_SERVER_ERROR;

      reply
        .status(statusCode)
        .send({ statusCode, message: clientMessage(statusCode, message) });
    }
  }
}
