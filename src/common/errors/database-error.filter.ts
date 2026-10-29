import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import { Request, Response } from 'express';
import { CONSTRAINT_ERROR_CODES } from 'src/db/constraint-codes';
import { getPgError } from 'src/db/errors';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';

const STATUS_BY_PG_CODE: Record<string, { status: number; message: string }> = {
  [UNIQUE_VIOLATION]: {
    status: HttpStatus.CONFLICT,
    message: 'Данные не уникальны',
  },
  [FOREIGN_KEY_VIOLATION]: {
    status: HttpStatus.CONFLICT,
    message: 'Связанная запись не найдена или используется',
  },
  [CHECK_VIOLATION]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Некорректные данные',
  },
};

/** Единственное место, где ошибка драйвера (`cause` с кодом Postgres и `constraint`) превращается в HTTP-ответ. */
@Catch(DrizzleQueryError)
export class DatabaseErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorFilter.name);

  catch(exception: DrizzleQueryError, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const cause = getPgError(exception);
    const mapped = cause?.code ? STATUS_BY_PG_CODE[cause.code] : undefined;

    this.logger.error(
      `${cause?.code ?? 'DB_ERROR'} ${cause?.constraint ?? ''} at ${request.method} ${request.url}`.replace(
        /\s+/g,
        ' ',
      ),
      exception.stack,
    );

    if (!mapped) {
      response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ statusCode: 500, message: 'Internal server error' });
      return;
    }

    response.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      code: cause?.constraint
        ? CONSTRAINT_ERROR_CODES.get(cause.constraint)
        : undefined,
    });
  }
}
