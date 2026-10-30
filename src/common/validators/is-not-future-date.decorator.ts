import { registerDecorator, ValidationOptions } from 'class-validator';
import { rule, ValidationCode } from '../errors/validation-code';

/** Сегодня в UTC как `YYYY-MM-DD`, как `CURRENT_DATE` в БД. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/** Дата `YYYY-MM-DD` не позже сегодняшней. Формат проверять отдельными правилами: строки сравниваются лексикографически. */
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
