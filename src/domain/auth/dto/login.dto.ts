import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX } from 'src/common/validators/is-password.decorator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

export const PHONE_PATTERN = /^\+\d{11}$/;

export class LoginDto {
  @ApiProperty({ example: '+79323572448' })
  @IsString(rule(ValidationCode.NOT_STRING))
  @Matches(PHONE_PATTERN, rule(ValidationCode.PHONE_FORMAT))
  phone: string;

  /** The complexity policy is not checked: passwords created under the old rules must be able to log in. */
  @ApiProperty({ example: 'Password123' })
  @IsString(rule(ValidationCode.NOT_STRING))
  @MinLength(1, rule(ValidationCode.TEXT_TOO_SHORT, { limit: 1 }))
  @MaxLength(
    PASSWORD_MAX,
    rule(ValidationCode.PASSWORD_TOO_LONG, { limit: PASSWORD_MAX }),
  )
  password: string;
}
