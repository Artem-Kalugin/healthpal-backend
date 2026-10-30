import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IsString, MaxLength, MinLength, validateSync } from 'class-validator';
import { IsPassword } from '../validators/is-password.decorator';
import { createValidationException } from './validation-exception.factory';
import { rule, ValidationCode } from './validation-code';

class Dto {
  @IsPassword()
  password: string;

  @MinLength(3, rule(ValidationCode.TEXT_TOO_SHORT, { limit: 3 }))
  name: string;

  @IsString()
  plain: string;

  @MaxLength(2)
  uncoded: string;
}

const validate = (plain: object) =>
  createValidationException(validateSync(plainToInstance(Dto, plain)))
    .validation;

describe('createValidationException', () => {
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  beforeEach(() => warn.mockClear());

  it('several rules per field: code from message, params from context', () => {
    expect(
      validate({ password: 'abc', name: 'ab', plain: 'x', uncoded: 'ab' })
        .password,
    ).toEqual([
      { code: ValidationCode.PASSWORD_TOO_SHORT, params: { limit: 8 } },
      { code: ValidationCode.PASSWORD_WEAK },
    ]);
  });

  it('params are taken from context', () => {
    expect(
      validate({ password: 'Password1', name: 'ab', plain: 'x', uncoded: 'ab' })
        .name,
    ).toEqual([{ code: ValidationCode.TEXT_TOO_SHORT, params: { limit: 3 } }]);
  });

  it('a built-in rule gets the default code', () => {
    expect(
      validate({ password: 'Password1', name: 'abc', plain: 1, uncoded: 'ab' })
        .plain,
    ).toEqual([{ code: ValidationCode.NOT_STRING }]);
  });

  it('unknown rule without rule(): INVALID_VALUE and warn', () => {
    expect(
      validate({
        password: 'Password1',
        name: 'abc',
        plain: 'x',
        uncoded: 'abc',
      }).uncoded,
    ).toEqual([{ code: ValidationCode.INVALID_VALUE }]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('maxLength'));
  });
});
