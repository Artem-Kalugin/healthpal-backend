import { applyDecorators } from '@nestjs/common';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiBearerJwtAuth } from './api-bearer-auth.decorator';
import { AuthRegistrationGuardType } from './auth-registration-type.decorator';

/** Требует JWT и этап регистрации (по умолчанию завершённую) и отмечает это в Swagger. */
export function Authenticated(
  type: AuthGuardsByRegistration = AuthGuardsByRegistration.COMPLETE_REGISTRATION,
) {
  return applyDecorators(ApiBearerJwtAuth(), AuthRegistrationGuardType(type));
}
