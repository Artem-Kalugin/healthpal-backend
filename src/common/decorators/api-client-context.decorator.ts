import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Locale } from 'src/common/i18n/locale';
import { Region } from 'src/db/enums';

/** Documents the headers read by `@ClientContext()`; put it on every handler that takes it. */
export function ApiClientContext() {
  return applyDecorators(
    ApiHeader({
      name: 'Accept-Language',
      required: false,
      description: 'Response language, exactly `ru` or `en`. Default `ru`.',
      enum: Locale,
    }),
    ApiHeader({
      name: 'X-Region',
      required: false,
      description: 'Catalog region, exactly `RU` or `EU`. Default `RU`.',
      enum: Region,
    }),
  );
}
