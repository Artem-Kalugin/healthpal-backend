import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsPassword } from 'src/common/validators/is-password.decorator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

export class ResetPasswordDto {
  @IsString(rule(ValidationCode.NOT_STRING))
  token: string;

  @ApiProperty({ example: 'Password123' })
  @IsPassword()
  password: string;

  @ApiProperty({ example: 'Password123' })
  @IsPassword()
  confirmPassword: string;
}
