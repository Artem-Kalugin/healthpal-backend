import { registerDecorator, ValidationOptions } from 'class-validator';
import { rule, ValidationCode } from '../errors/validation-code';

/** The value must equal another field of the same object (password confirmation). The error is attached to the decorated field. */
export const IsSameAs =
  <T extends object>(
    field: keyof T & string,
    options: ValidationOptions = rule(ValidationCode.VALUES_MISMATCH),
  ): PropertyDecorator =>
  (target, propertyKey) => {
    registerDecorator({
      name: 'isSameAs',
      target: target.constructor,
      propertyName: propertyKey as string,
      constraints: [field],
      options,
      validator: {
        validate: (value: unknown, validationArguments) => {
          const object = validationArguments?.object as Record<string, unknown>;

          return value === object[field];
        },
      },
    });
  };
