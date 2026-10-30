import { ExecutionContext } from '@nestjs/common';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { Reflector } from '@nestjs/core';
import { AuthGuardsByRegistration } from 'src/common/config';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { JwtAuthWithRegistrationGuard } from './jwt-auth-with-registration.guard';

const { COMPLETE_REGISTRATION, INCOMPLETE_REGISTRATION, ANY } =
  AuthGuardsByRegistration;

class PublicOnHandler {
  @Public()
  handler() {}
}

@Public()
class PublicOnClass {
  handler() {}
}

class NoLevel {
  handler() {}
}

@AuthRegistrationGuardType(COMPLETE_REGISTRATION)
class CompleteOnClass {
  handler() {}

  @AuthRegistrationGuardType(ANY)
  overridden() {}
}

class IncompleteOnHandler {
  @AuthRegistrationGuardType(INCOMPLETE_REGISTRATION)
  handler() {}
}

class AnyOnHandler {
  @AuthRegistrationGuardType(ANY)
  handler() {}
}

type Target = new () => object;

describe('JwtAuthWithRegistrationGuard', () => {
  const guard = new JwtAuthWithRegistrationGuard(new Reflector());
  const passportCanActivate = jest.spyOn(
    Object.getPrototypeOf(JwtAuthWithRegistrationGuard.prototype) as {
      canActivate: () => Promise<boolean>;
    },
    'canActivate',
  );

  const contextFor = (
    target: Target,
    user: { registrationComplete?: boolean } | undefined,
    method = 'handler',
  ) =>
    ({
      getClass: () => target,
      getHandler: () =>
        (target.prototype as Record<string, () => void>)[method],
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    passportCanActivate.mockReset().mockResolvedValue(true);
  });

  describe('@Public', () => {
    it.each([
      ['на методе', PublicOnHandler],
      ['на классе', PublicOnClass],
    ])('%s: пропускает без проверки токена', async (...[, target]) => {
      await expect(
        guard.canActivate(contextFor(target, undefined)),
      ).resolves.toBe(true);
      expect(passportCanActivate).not.toHaveBeenCalled();
    });
  });

  describe('уровень регистрации', () => {
    it('не Public и уровень не задан: бросает обычную ошибку, а не HTTP-исключение', async () => {
      const error: unknown = await guard
        .canActivate(contextFor(NoLevel, { registrationComplete: true }))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(AppException);
    });

    it('читает уровень с класса, если на методе его нет', async () => {
      const context = contextFor(CompleteOnClass, {
        registrationComplete: false,
      });

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        code: ErrorCode.REGISTRATION_INCOMPLETE,
      });
    });

    it('уровень на методе перекрывает уровень класса', async () => {
      const context = contextFor(
        CompleteOnClass,
        { registrationComplete: false },
        'overridden',
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  it('passport отклонил запрос: возвращает false, уровень не проверяется', async () => {
    passportCanActivate.mockResolvedValue(false);

    await expect(
      guard.canActivate(contextFor(AnyOnHandler, undefined)),
    ).resolves.toBe(false);
  });

  it('passport пропустил, но пользователя в запросе нет: Unauthorized', async () => {
    await expect(
      guard.canActivate(contextFor(AnyOnHandler, undefined)),
    ).rejects.toMatchObject({ code: ErrorCode.UNAUTHORIZED });
  });

  describe.each<
    [string, Target, Array<[boolean | undefined, 'allow' | 'forbid']>]
  >([
    [
      'COMPLETE_REGISTRATION',
      CompleteOnClass,
      [
        [true, 'allow'],
        [false, 'forbid'],
        [undefined, 'forbid'],
      ],
    ],
    [
      'INCOMPLETE_REGISTRATION',
      IncompleteOnHandler,
      [
        [false, 'allow'],
        [true, 'forbid'],
        [undefined, 'forbid'],
      ],
    ],
    [
      'ANY',
      AnyOnHandler,
      [
        [true, 'allow'],
        [false, 'allow'],
        [undefined, 'allow'],
      ],
    ],
  ])('%s', (...[, target, table]) => {
    it.each(table)('registrationComplete=%s: %s', async (value, outcome) => {
      const result = guard.canActivate(
        contextFor(target, { registrationComplete: value }),
      );

      if (outcome === 'allow') await expect(result).resolves.toBe(true);
      else await expect(result).rejects.toBeInstanceOf(AppException);
    });
  });
});
