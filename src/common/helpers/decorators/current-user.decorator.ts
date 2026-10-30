import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

/** Id пользователя из JWT. Только для эндпоинтов за guard'ом, не `@Public()`. */
export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const { user } = context.switchToHttp().getRequest<Request>();

    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, {
        message: '@CurrentUserId() на эндпоинте без авторизации',
      });
    }

    return user.id;
  },
);
