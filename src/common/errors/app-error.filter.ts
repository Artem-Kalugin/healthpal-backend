import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import { Request, Response } from 'express';
import { Constraint } from 'src/db/constraints';
import {
  CHECK_VIOLATION,
  FOREIGN_KEY_VIOLATION,
  getPgError,
  UNIQUE_VIOLATION,
} from 'src/db/errors';
import { AppException } from './app.exception';
import { CODE_BY_HTTP_STATUS, ERROR_STATUS, ErrorCode } from './error-code';
import { ValidationFailedException } from './validation.exception';

/** Constraints a user can violate on their own: they have a public code. The rest reach the client as `INTERNAL_ERROR`. */
export const CONSTRAINT_CODES: Partial<Record<Constraint, ErrorCode>> = {
  [Constraint.USER_PHONE_UNIQUE]: ErrorCode.USER_PHONE_TAKEN,
  [Constraint.USER_NICKNAME_UNIQUE]: ErrorCode.USER_NICKNAME_TAKEN,
  [Constraint.USER_PHONE_FORMAT_CHECK]: ErrorCode.USER_PHONE_INVALID,
  [Constraint.USER_BIRTHDAY_PAST_CHECK]: ErrorCode.USER_BIRTHDAY_INVALID,
  [Constraint.APPOINTMENT_TIME_SLOT_UNIQUE]: ErrorCode.APPOINTMENT_SLOT_TAKEN,
  [Constraint.USER_FAVORITE_DOCTOR_PK]: ErrorCode.FAVORITE_ALREADY_EXISTS,
  [Constraint.USER_FAVORITE_MEDICAL_CENTER_PK]:
    ErrorCode.FAVORITE_ALREADY_EXISTS,
  [Constraint.DOCTOR_SCHEDULE_WEEKDAY_CHECK]:
    ErrorCode.SCHEDULE_WEEKDAY_INVALID,
};

const DB_CODE_BY_PG_CODE: Record<string, ErrorCode> = {
  [UNIQUE_VIOLATION]: ErrorCode.DB_UNIQUE_VIOLATION,
  [FOREIGN_KEY_VIOLATION]: ErrorCode.DB_FOREIGN_KEY_VIOLATION,
  [CHECK_VIOLATION]: ErrorCode.DB_CHECK_VIOLATION,
};

/** Internal code for the log and code for the client; `detail` is appended to the log. */
const resolve = (exception: unknown) => {
  if (exception instanceof AppException) {
    return {
      code: exception.code,
      clientCode: exception.clientCode,
      detail: undefined,
    };
  }

  if (exception instanceof DrizzleQueryError) {
    const pgError = getPgError(exception);
    const publicCode = CONSTRAINT_CODES[pgError?.constraint as Constraint];
    const code =
      publicCode ??
      (pgError?.code ? DB_CODE_BY_PG_CODE[pgError.code] : undefined) ??
      ErrorCode.DB_ERROR;

    return {
      code,
      clientCode: publicCode ?? ErrorCode.INTERNAL_ERROR,
      detail: pgError?.constraint,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code =
      CODE_BY_HTTP_STATUS[status] ??
      (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.BAD_REQUEST);

    return { code, clientCode: code, detail: exception.message };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    clientCode: ErrorCode.INTERNAL_ERROR,
    detail: exception instanceof Error ? exception.message : undefined,
  };
};

/** The only place where any error becomes an HTTP response `{ statusCode, code }` (plus `validation` for validation errors). Unknown errors are returned as `INTERNAL_ERROR`, details only in the log. */
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const { code, clientCode, detail } = resolve(exception);
    const statusCode = ERROR_STATUS[clientCode];

    const line = [
      code,
      code === clientCode ? undefined : `-> ${clientCode}`,
      detail,
      exception instanceof AppException ? exception.message : undefined,
      `at ${request.method} ${request.url}`,
    ]
      .filter(Boolean)
      .join(' ');

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(line);
    }

    response.status(statusCode).json({
      statusCode,
      code: clientCode,
      ...(exception instanceof ValidationFailedException && {
        validation: exception.validation,
      }),
    });
  }
}
