import { HttpException } from '@nestjs/common';
import { ERROR_STATUS, ErrorCode } from './error-code';

interface AppExceptionOptions {
  /** What the client sees instead of `code`; `ErrorCode.INTERNAL_ERROR` hides the cause entirely. */
  clientCode?: ErrorCode;
  /** For the log only. */
  message?: string;
  cause?: unknown;
}

/** `code` goes to the log, the client gets `clientCode ?? code`, the status is chosen by the same code. */
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
