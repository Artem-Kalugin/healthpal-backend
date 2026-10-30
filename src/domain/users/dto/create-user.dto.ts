import { OmitType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength, MinLength } from 'class-validator';
import { LoginDto } from 'src/domain/auth/dto/login.dto';
import { IsPassword } from 'src/common/validators/is-password.decorator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

const NAME_MIN = 2;
const NAME_MAX = 16;
/** Letters of any script, parts separated by a hyphen, an apostrophe or a space ("Anna-Maria", "O'Connor", "van der Berg"). */
const NAME_PATTERN = /^\p{L}+(?:[-'’ ]\p{L}+)*$/u;

export class CreateUserDto extends OmitType(LoginDto, ['password']) {
  @ApiProperty({ example: 'Password123' })
  @IsPassword()
  password: string;

  @MaxLength(NAME_MAX, rule(ValidationCode.TEXT_TOO_LONG, { limit: NAME_MAX }))
  @MinLength(NAME_MIN, rule(ValidationCode.TEXT_TOO_SHORT, { limit: NAME_MIN }))
  @Matches(NAME_PATTERN, rule(ValidationCode.NAME_FORMAT))
  name: string;

  @MaxLength(NAME_MAX, rule(ValidationCode.TEXT_TOO_LONG, { limit: NAME_MAX }))
  @MinLength(NAME_MIN, rule(ValidationCode.TEXT_TOO_SHORT, { limit: NAME_MIN }))
  @Matches(NAME_PATTERN, rule(ValidationCode.NAME_FORMAT))
  surname: string;
}
