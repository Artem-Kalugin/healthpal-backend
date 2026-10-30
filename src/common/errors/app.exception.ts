import { HttpException } from '@nestjs/common';
import { ERROR_STATUS, ErrorCode } from './error-code';

interface AppExceptionOptions {
  /** Что увидит клиент вместо `code`; `ErrorCode.INTERNAL_ERROR` скрывает причину целиком. */
  clientCode?: ErrorCode;
  /** Только для лога. */
  message?: string;
  cause?: unknown;
}

/** `code` пишется в лог, клиент получает `clientCode ?? code`, статус выбирается по тому же коду. */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly clientCode: ErrorCode;

  constructor(code: ErrorCode, options: AppExceptionOptions = {}) {
    const clientCode = options.clientCode ?? code;
    const status = ERROR_STATUS[clientCode];

    super({ statusCode: status, code: clientCode }, status, {
      cause: options.cause,
    });

    this.code = code;
    this.clientCode = clientCode;
    this.message = options.message ?? code;
  }
}
