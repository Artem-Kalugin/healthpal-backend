import 'reflect-metadata';

export const NOT_INIQUE_ERROR_TEXT_KEY = Symbol('not_unique_error_text');

export function NotUniqueErrorMetadata(label: string) {
  return <T extends object>(target: T, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      NOT_INIQUE_ERROR_TEXT_KEY,
      label,
      target,
      propertyKey,
    );
  };
}

export function getNotUniqueErrorText(
  target: object,
  propertyKey: string | symbol,
) {
  return Reflect.getMetadata(NOT_INIQUE_ERROR_TEXT_KEY, target, propertyKey) as
    | string
    | undefined;
}
