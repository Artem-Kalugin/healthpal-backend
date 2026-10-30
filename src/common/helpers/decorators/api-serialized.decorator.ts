import { applyDecorators, SerializeOptions } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { ApiResponseMetadata } from '@nestjs/swagger';

type Options = Omit<ApiResponseMetadata, 'type'> & {
  /** Тип в Swagger, если он отличается от типа сериализации (пагинация). */
  swaggerType?: ApiResponseMetadata['type'];
  created?: boolean;
};

/** Описание ответа в Swagger и тип сериализации (белый список `@Expose`) одним декоратором. */
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
