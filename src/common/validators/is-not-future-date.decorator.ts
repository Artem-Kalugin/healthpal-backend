import { registerDecorator, ValidationOptions } from 'class-validator';
import { rule, ValidationCode } from '../errors/validation-code';

/** Today in UTC as `YYYY-MM-DD`, like `CURRENT_DATE` in the DB. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/** A `YYYY-MM-DD` date not later than today. Check the format with separate rules: strings are compared lexicographically. */
export const IsNotFutureDate =
  (
    options: ValidationOptions = rule(ValidationCode.DATE_IN_FUTURE),
  ): PropertyDecorator =>
  (target, propertyKey) => {
    registerDecorator({
      name: 'isNotFutureDate',
      target: target.constructor,
      propertyName: propertyKey as string,
      options,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && value <= todayUtc(),
      },
    });
  };
