import { applyDecorators, SerializeOptions } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { ApiResponseMetadata } from '@nestjs/swagger';
import {
  PaginatedResponseDto,
  PaginatedResponseOf,
} from 'src/common/pagination/paginated-response.dto';

type Options = Omit<ApiResponseMetadata, 'type'> & {
  /** Swagger type if it differs from the serialization type. */
  swaggerType?: ApiResponseMetadata['type'];
  created?: boolean;
  /** The handler returns the result of `paginate`: `type` describes the items of `data`. */
  paginated?: boolean;
};

/** Swagger response description and serialization type (`@Expose` whitelist) in one decorator. */
export function ApiSerialized(
  type: new (...arguments_: never[]) => object,
  { swaggerType, created, paginated, ...response }: Options = {},
) {
  const apiResponse = created ? ApiCreatedResponse : ApiOkResponse;

  // `data` is generic, so Swagger needs the item type spelled out per endpoint.
  const paginatedSchema = {
    allOf: [
      { $ref: getSchemaPath(PaginatedResponseDto) },
      {
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(type) } },
        },
      },
    ],
  };

  return applyDecorators(
    ...(paginated ? [ApiExtraModels(PaginatedResponseDto, type)] : []),
    apiResponse({
      ...response,
      ...(paginated && !swaggerType
        ? { schema: paginatedSchema }
        : { type: swaggerType ?? type }),
    }),
    SerializeOptions({
      type: paginated ? PaginatedResponseOf(type) : type,
    }),
  );
}
