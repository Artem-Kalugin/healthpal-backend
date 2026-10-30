import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { Region } from 'src/db/enums';
import { Locale } from './locale';

export type RequestContext = { locale: Locale; region: Region };

/** The client sends exact enum values by hand, so there is no normalization. */
const parseHeader = <T extends string>(
  headers: Request['headers'],
  name: string,
  values: Record<string, T>,
  fallback: T,
): T => {
  const value = headers[name];

  if (value === undefined) {
    return fallback;
  }

  if (
    typeof value !== 'string' ||
    !Object.values<string>(values).includes(value)
  ) {
    throw new AppException(ErrorCode.INVALID_REQUEST_CONTEXT, {
      message: `Unsupported ${name}: ${String(value)}`,
    });
  }

  return value as T;
};

/**
 * `Accept-Language` is `ru` or `en`, `X-Region` is `RU` or `EU`; anything else is a client bug and gets 400.
 * A missing header keeps the Russian default of the existing client.
 */
export const parseRequestContext = (
  headers: Request['headers'],
): RequestContext => ({
  locale: parseHeader(headers, 'accept-language', Locale, Locale.RU),
  region: parseHeader(headers, 'x-region', Region, Region.RU),
});

/** Locale and region from `Accept-Language` and `X-Region`; pass it to services explicitly, like `userId`. */
export const ClientContext = createParamDecorator(
  (data: unknown, context: ExecutionContext): RequestContext =>
    parseRequestContext(context.switchToHttp().getRequest<Request>().headers),
);
