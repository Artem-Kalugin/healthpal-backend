import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuardsByRegistration } from 'src/common/config';
import { IS_PUBLIC_KEY } from 'src/common/helpers/decorators/public.decorator';
import { AUTH_REGISTRATION_TYPE_KEY } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuard } from '@nestjs/passport';
import { JwtContent } from 'declarations';
import type { Request } from 'express';

@Injectable()
export class JwtAuthWithRegistrationGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredType = this.reflector.getAllAndOverride<
      AuthGuardsByRegistration | undefined
    >(AUTH_REGISTRATION_TYPE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredType) {
      throw Error(
        'Auth guard error, either define registration guard level check or make endpoints @public',
      );
    }

    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtContent }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Пользователь не найден');

    switch (requiredType) {
      case AuthGuardsByRegistration.COMPLETE_REGISTRATION:
        return this.checkComplete(user);
      case AuthGuardsByRegistration.INCOMPLETE_REGISTRATION:
        return this.checkIncomplete(user);
      case AuthGuardsByRegistration.ANY:
        return true;
    }
  }

  private checkComplete(user: JwtContent) {
    if (user.registrationComplete !== true) {
      throw new ForbiddenException('Регистрация не завершена');
    }
    return true;
  }

  private checkIncomplete(user: JwtContent) {
    if (user.registrationComplete !== false) {
      throw new ForbiddenException('Регистрация уже завершена');
    }
    return true;
  }
}
