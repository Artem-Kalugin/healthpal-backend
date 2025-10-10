import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString({ message: 'Отсутстсвует токен' })
  token: string;

  @ApiProperty({ example: 'Password123' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 4 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  // eslint-disable-next-line sonarjs/regex-complexity
  @Matches(/^(?:(?=.*[a-z])(?=.*[A-Z])|(?=.*[A-Za-z])(?=.*\d)).+$/, {
    message: 'Пароль должен содержать буквы различного регистра или цифру',
  })
  password: string;

  @ApiProperty({ example: 'Password123' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 4 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  // eslint-disable-next-line sonarjs/regex-complexity
  @Matches(/^(?:(?=.*[a-z])(?=.*[A-Z])|(?=.*[A-Za-z])(?=.*\d)).+$/, {
    message: 'Пароль должен содержать буквы различного регистра или цифру',
  })
  confirmPassword: string;
}
