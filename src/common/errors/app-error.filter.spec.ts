import {
  ArgumentsHost,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { Constraint } from 'src/db/constraints';
import { AppErrorFilter } from './app-error.filter';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';
import { ValidationCode } from './validation-code';
import { ValidationFailedException } from './validation.exception';

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

  const run = (exception: unknown) => {
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

  describe('DB errors', () => {
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
      'public constraint: %s %s → %i %s',
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
      'constraint without a public code (%s %s) → client gets INTERNAL_ERROR, log has %s',
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

    it('non-pg cause (dropped connection) → INTERNAL_ERROR, log code DB_ERROR', () => {
      expect(run(queryError(new Error('ECONNRESET')))).toEqual({
        status: 500,
        body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('DB_ERROR -> INTERNAL_ERROR'),
        expect.any(String),
      );
    });

    it('the response does not include the constraint or the driver error text', () => {
      const { body } = run(
        queryError(pgError('23503', Constraint.APPOINTMENT_USER_FK)),
      );

      expect(JSON.stringify(body)).not.toMatch(/appointment_user_fk|db error/);
    });
  });

  describe('AppException', () => {
    it('client gets the code, the status is chosen by it', () => {
      expect(run(new AppException(ErrorCode.USER_PHONE_TAKEN))).toEqual({
        status: 409,
        body: { statusCode: 409, code: ErrorCode.USER_PHONE_TAKEN },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('USER_PHONE_TAKEN'),
      );
      expect(error).not.toHaveBeenCalled();
    });

    it('clientCode replaces code and status, both go to the log', () => {
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

    it('clientCode INTERNAL_ERROR hides the cause: 500, the log has code and message', () => {
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

  describe('ValidationFailedException', () => {
    it('puts validation next to statusCode and code, logs warn', () => {
      const validation = {
        password: [
          { code: ValidationCode.PASSWORD_TOO_SHORT, params: { limit: 8 } },
          { code: ValidationCode.PASSWORD_WEAK },
        ],
      };

      expect(run(new ValidationFailedException(validation))).toEqual({
        status: 400,
        body: {
          statusCode: 400,
          code: ErrorCode.VALIDATION_FAILED,
          validation,
        },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('password: PASSWORD_TOO_SHORT,PASSWORD_WEAK'),
      );
    });
  });

  describe('Nest exceptions', () => {
    it.each([
      [new NotFoundException('Cannot GET /x'), 404, ErrorCode.NOT_FOUND],
      [new ForbiddenException('text'), 403, ErrorCode.FORBIDDEN],
      [new ThrottlerException(), 429, ErrorCode.TOO_MANY_REQUESTS],
      [new PayloadTooLargeException(), 413, ErrorCode.PAYLOAD_TOO_LARGE],
      [new HttpException('teapot', 418), 400, ErrorCode.BAD_REQUEST],
    ])('%s → %s %s without message in the body', (exception, status, code) => {
      expect(run(exception)).toEqual({
        status,
        body: { statusCode: status, code },
      });
    });

    it('5xx without an entry → INTERNAL_ERROR, logs error', () => {
      expect(run(new HttpException('boom', 502))).toEqual({
        status: 500,
        body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
      });
      expect(error).toHaveBeenCalled();
    });
  });

  describe('unknown errors', () => {
    it('Error → 500 INTERNAL_ERROR, text and stack only in the log', () => {
      const { status, body } = run(new Error('secret detail'));

      expect(status).toBe(500);
      expect(body).toEqual({
        statusCode: 500,
        code: ErrorCode.INTERNAL_ERROR,
      });
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('secret detail'),
        expect.stringContaining('Error: secret detail'),
      );
    });

    it('non-Error (string) → 500 INTERNAL_ERROR', () => {
      expect(run('oops')).toEqual({
        status: 500,
        body: { statusCode: 500, code: ErrorCode.INTERNAL_ERROR },
      });
    });
  });
});
