import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

export function ApiBearerJwtAuth() {
  return applyDecorators(ApiBearerAuth('JWT'));
}
