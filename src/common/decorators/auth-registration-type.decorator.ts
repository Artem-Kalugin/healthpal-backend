import { SetMetadata } from '@nestjs/common';
import { AuthGuardsByRegistration } from '../types/auth-guard-by-registration-completion.config';

export const AUTH_REGISTRATION_TYPE_KEY = 'auth:registrationType';

export const AuthRegistrationGuardType = (type: AuthGuardsByRegistration) =>
  SetMetadata(AUTH_REGISTRATION_TYPE_KEY, type);
