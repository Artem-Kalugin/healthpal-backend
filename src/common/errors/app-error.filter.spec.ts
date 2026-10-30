import { ArgumentsHost, Logger } from '@nestjs/common';
import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { Constraint } from 'src/db/constraints';
import { AppErrorFilter } from './app-error.filter';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';

const pgError = (code: string, constraint?: string) =>
  Object.assign(new DatabaseError('db error', 0, 'error'), {
    code,
    constraint,
  });

const queryError = (cause: Error) =>
  new DrizzleQueryError('select 1', [], cause);

describe('AppErrorFilter', () => {
  const filter = new AppErrorFilter();
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

  beforeEach(() => {
    warn.mockClear();
    error.mockClear();
  });

  const run = (exception: AppException | DrizzleQueryError) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/x' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    return {
      status: (status.mock.calls[0] as unknown as [number])[0],
      body: (json.mock.calls[0] as unknown[])[0],
    };
  };

  describe('ошибки БД', () => {
    it.each([
      ['23505', Constraint.USER_PHONE_UNIQUE, 409, ErrorCode.USER_PHONE_TAKEN],
      [
        '23505',
        Constraint.APPOINTMENT_TIME_SLOT_UNIQUE,
        409,
        ErrorCode.APPOINTMENT_SLOT_TAKEN,
      ],
      [
        '23505',
        Constraint.USER_FAVORITE_DOCTOR_PK,
        409,
        ErrorCode.FAVORITE_ALREADY_EXISTS,
      ],
      [
        '23514',
        Constraint.USER_PHONE_FORMAT_CHECK,
        400,
        ErrorCode.USER_PHONE_INVALID,
      ],
    ])(
      'публичное ограничение: %s %s → %i %s',
      (pgCode, constraint, statusCode, code) => {
        expect(run(queryError(pgError(pgCode, constraint)))).toEqual({
          status: statusCode,
          body: { statusCode, code },
        });
      },
    );

    it.each([
      ['23505', Constraint.DOCTOR_CATEGORY_FK, 'DB_UNIQUE_VIOLATION'],
      ['23503', Constraint.APPOINTMENT_USER_FK, 'DB_FOREIGN_KEY_VIOLATION'],
      ['23514', 'unknown_check', 'DB_CHECK_VIOLATION'],
      ['42P01', undefined, 'DB_ERROR'],
    ])(
      'ограничение без публичного кода (%s %s) → клиенту INTERNAL_ERROR, в логе %s',
      (pgCode, constraint, logged) => {
        expect(run(queryError(pgError(pgCode, constraint)))).toEqual({
          status: 500,
          body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
        });
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining(`${logged} -> INTERNAL_ERROR`),
          expect.any(String),
        );
      },
    );

    it('не-pg причина (обрыв соединения) → INTERNAL_ERROR, код в логе DB_ERROR', () => {
      expect(run(queryError(new Error('ECONNRESET')))).toEqual({
        status: 500,
        body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('DB_ERROR -> INTERNAL_ERROR'),
        expect.any(String),
      );
    });

    it('в ответ не попадают constraint и текст ошибки драйвера', () => {
      const { body } = run(
        queryError(pgError('23503', Constraint.APPOINTMENT_USER_FK)),
      );

      expect(JSON.stringify(body)).not.toMatch(/appointment_user_fk|db error/);
    });
  });

  describe('AppException', () => {
    it('клиент получает code, статус выбирается по нему', () => {
      expect(run(new AppException(ErrorCode.USER_PHONE_TAKEN))).toEqual({
        status: 409,
        body: { statusCode: 409, code: ErrorCode.USER_PHONE_TAKEN },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('USER_PHONE_TAKEN'),
      );
      expect(error).not.toHaveBeenCalled();
    });

    it('clientCode подменяет code и статус, в лог идут оба', () => {
      expect(
        run(
          new AppException(ErrorCode.USER_PHONE_TAKEN, {
            clientCode: ErrorCode.USER_PHONE_INVALID,
          }),
        ),
      ).toEqual({
        status: 400,
        body: { statusCode: 400, code: ErrorCode.USER_PHONE_INVALID },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('USER_PHONE_TAKEN -> USER_PHONE_INVALID'),
      );
    });

    it('clientCode INTERNAL_ERROR скрывает причину: 500, в логе код и message', () => {
      expect(
        run(
          new AppException(ErrorCode.DB_ERROR, {
            clientCode: ErrorCode.INTERNAL_ERROR,
            message: 'storage down',
          }),
        ),
      ).toEqual({
        status: 500,
        body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(/DB_ERROR -> INTERNAL_ERROR.*storage down/),
        expect.any(String),
      );
    });
  });
});
