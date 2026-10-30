import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { rule, ValidationCode } from '../errors/validation-code';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 50;

/** Lowercase and (uppercase or digits): at least two character types. */
const PASSWORD_STRENGTH = /^(?=.*\p{Ll})(?=.*[\p{Lu}\d]).+$/u;

/** Password policy on create or change. Do not use for login: old passwords must pass. */
export const IsPassword = () =>
  applyDecorators(
    IsString(rule(ValidationCode.NOT_STRING)),
    MinLength(
      PASSWORD_MIN,
      rule(ValidationCode.PASSWORD_TOO_SHORT, { limit: PASSWORD_MIN }),
    ),
    MaxLength(
      PASSWORD_MAX,
      rule(ValidationCode.PASSWORD_TOO_LONG, { limit: PASSWORD_MAX }),
    ),
    Matches(PASSWORD_STRENGTH, rule(ValidationCode.PASSWORD_WEAK)),
  );
