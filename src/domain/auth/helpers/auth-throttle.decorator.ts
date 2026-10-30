import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

export const AUTH_THROTTLE_LIMIT = 10;
export const AUTH_THROTTLE_TTL_MS = 60_000;

export function AuthThrottle() {
  return applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({
      default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS },
    }),
  );
}
