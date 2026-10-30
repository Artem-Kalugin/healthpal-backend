import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

/** User id from the JWT. Only for endpoints behind the guard, not `@Public()`. */
export const CurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const { user } = context.switchToHttp().getRequest<Request>();

    if (!user) {
      throw new AppException(ErrorCode.UNAUTHORIZED, {
        message: '@CurrentUserId() on an endpoint without authorization',
      });
    }

    return user.id;
  },
);
