import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { ApiResponseMetadata } from '@nestjs/swagger';

type Options = Omit<ApiResponseMetadata, 'type'> & {
  /** Swagger type if it differs from the serialization type (pagination). */
  swaggerType?: ApiResponseMetadata['type'];
  created?: boolean;
};

/** Swagger response description and serialization type (`@Expose` whitelist) in one decorator. */
export function ApiSerialized(
  type: new (...arguments_: never[]) => object,
  { swaggerType = type, created, ...response }: Options = {},
) {
  const apiResponse = created ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    apiResponse({ ...response, type: swaggerType }),
    SerializeOptions({ type }),
  );
}
