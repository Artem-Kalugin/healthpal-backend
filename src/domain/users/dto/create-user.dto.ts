import { OmitType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength, MinLength } from 'class-validator';
import { LoginDto } from 'src/domain/auth/dto/login.dto';
import { IsPassword } from 'src/common/validators/is-password.decorator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

const NAME_MIN = 2;
const NAME_MAX = 16;
const NAME_PATTERN = /^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/;

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
