import { ValidationOptions } from 'class-validator';

/**
 * DTO validation error codes: the client picks the localized text by them.
 * Values must not change without agreeing with the client.
 */
export enum ValidationCode {
  NOT_STRING = 'NOT_STRING',
  INVALID_UUID = 'INVALID_UUID',
  INVALID_INTEGER = 'INVALID_INTEGER',
  INVALID_BOOLEAN = 'INVALID_BOOLEAN',
  INVALID_ENUM = 'INVALID_ENUM',
  INVALID_DATE = 'INVALID_DATE',
  /** Fallback code for a rule that did not go through `rule()` and is not covered by the default table. */
  INVALID_VALUE = 'INVALID_VALUE',
  /** Extra field in the body (`forbidNonWhitelisted`). */
  UNKNOWN_FIELD = 'UNKNOWN_FIELD',

  TEXT_TOO_SHORT = 'TEXT_TOO_SHORT',
  TEXT_TOO_LONG = 'TEXT_TOO_LONG',
  VALUE_TOO_SMALL = 'VALUE_TOO_SMALL',
  VALUE_TOO_BIG = 'VALUE_TOO_BIG',

  PHONE_FORMAT = 'PHONE_FORMAT',
  OTP_FORMAT = 'OTP_FORMAT',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG = 'PASSWORD_TOO_LONG',
  PASSWORD_WEAK = 'PASSWORD_WEAK',
  NUMBER_FORMAT = 'NUMBER_FORMAT',
  DATE_FORMAT = 'DATE_FORMAT',
  DATE_IN_FUTURE = 'DATE_IN_FUTURE',
  NAME_FORMAT = 'NAME_FORMAT',
  NICKNAME_HAS_SPACES = 'NICKNAME_HAS_SPACES',
}

/** Parameter shape of each code; `undefined` means no parameters. */
export interface ValidationParameters {
  [ValidationCode.NOT_STRING]: undefined;
  [ValidationCode.INVALID_UUID]: undefined;
  [ValidationCode.INVALID_INTEGER]: undefined;
  [ValidationCode.INVALID_BOOLEAN]: undefined;
  [ValidationCode.INVALID_ENUM]: undefined;
  [ValidationCode.INVALID_DATE]: undefined;
  [ValidationCode.INVALID_VALUE]: undefined;
  [ValidationCode.UNKNOWN_FIELD]: undefined;

  [ValidationCode.TEXT_TOO_SHORT]: { limit: number };
  [ValidationCode.TEXT_TOO_LONG]: { limit: number };
  [ValidationCode.VALUE_TOO_SMALL]: { limit: number };
  [ValidationCode.VALUE_TOO_BIG]: { limit: number };

  [ValidationCode.PHONE_FORMAT]: undefined;
  [ValidationCode.OTP_FORMAT]: { length: number };
  [ValidationCode.PASSWORD_TOO_SHORT]: { limit: number };
  [ValidationCode.PASSWORD_TOO_LONG]: { limit: number };
  [ValidationCode.PASSWORD_WEAK]: undefined;
  [ValidationCode.NUMBER_FORMAT]: undefined;
  [ValidationCode.DATE_FORMAT]: undefined;
  [ValidationCode.DATE_IN_FUTURE]: undefined;
  [ValidationCode.NAME_FORMAT]: undefined;
  [ValidationCode.NICKNAME_HAS_SPACES]: undefined;
}

type RuleArguments<C extends ValidationCode> =
  ValidationParameters[C] extends undefined
    ? []
    : [parameters: ValidationParameters[C]];

/**
 * class-validator options for DTOs: `message` carries the code, `context` carries the parameters.
 * Take the parameters from the same constant as the decorator argument.
 */
export const rule = <C extends ValidationCode>(
  code: C,
  ...[parameters]: RuleArguments<C>
): ValidationOptions => ({ message: code, context: parameters });

export const isValidationCode = (value: unknown): value is ValidationCode =>
  Object.values(ValidationCode).includes(value as ValidationCode);

/** Code of a built-in class-validator rule when the DTO has no `rule()`. The key is the rule name from `ValidationError.constraints`. */
export const DEFAULT_RULE_CODES: Record<string, ValidationCode> = {
  isString: ValidationCode.NOT_STRING,
  isUuid: ValidationCode.INVALID_UUID,
  isInt: ValidationCode.INVALID_INTEGER,
  isBoolean: ValidationCode.INVALID_BOOLEAN,
  isEnum: ValidationCode.INVALID_ENUM,
  isIn: ValidationCode.INVALID_ENUM,
  isDateString: ValidationCode.INVALID_DATE,
  whitelistValidation: ValidationCode.UNKNOWN_FIELD,
};
