import { HttpStatus } from '@nestjs/common';

/**
 * Публичные коды ошибок: клиент по ним подбирает локализованный текст.
 * Значение менять нельзя без согласования с клиентом.
 */
export enum ErrorCode {
  /** Общий ответ вместо внутренних деталей. */
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  USER_PHONE_TAKEN = 'USER_PHONE_TAKEN',
  USER_PHONE_INVALID = 'USER_PHONE_INVALID',
  USER_NICKNAME_TAKEN = 'USER_NICKNAME_TAKEN',
  USER_BIRTHDAY_INVALID = 'USER_BIRTHDAY_INVALID',
  APPOINTMENT_SLOT_TAKEN = 'APPOINTMENT_SLOT_TAKEN',
  FAVORITE_ALREADY_EXISTS = 'FAVORITE_ALREADY_EXISTS',
  SCHEDULE_WEEKDAY_INVALID = 'SCHEDULE_WEEKDAY_INVALID',

  /** Только для логов: ограничение БД без публичного кода, клиент получает `INTERNAL_ERROR`. */
  DB_UNIQUE_VIOLATION = 'DB_UNIQUE_VIOLATION',
  DB_FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
  DB_CHECK_VIOLATION = 'DB_CHECK_VIOLATION',
  DB_ERROR = 'DB_ERROR',
}

/** HTTP-статус каждого кода; всегда берётся по коду, который уходит клиенту, чтобы статус не выдавал скрытую причину. */
export const ERROR_STATUS: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,

  [ErrorCode.USER_PHONE_TAKEN]: HttpStatus.CONFLICT,
  [ErrorCode.USER_PHONE_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCode.USER_NICKNAME_TAKEN]: HttpStatus.CONFLICT,
  [ErrorCode.USER_BIRTHDAY_INVALID]: HttpStatus.BAD_REQUEST,
  [ErrorCode.APPOINTMENT_SLOT_TAKEN]: HttpStatus.CONFLICT,
  [ErrorCode.FAVORITE_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCode.SCHEDULE_WEEKDAY_INVALID]: HttpStatus.BAD_REQUEST,

  [ErrorCode.DB_UNIQUE_VIOLATION]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DB_FOREIGN_KEY_VIOLATION]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DB_CHECK_VIOLATION]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DB_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};
