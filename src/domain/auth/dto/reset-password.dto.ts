import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Отсутстсвует токен' })
  token: string;

  @ApiProperty({ example: 'Password123' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 4 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  @Matches(/^(?=.*\p{Ll})(?=.*[\p{Lu}\d]).+$/u, {
    message:
      'Пароль должен содержать как минимум два типа символов: строчные, прописные или цифры',
  })
  password: string;

  @ApiProperty({ example: 'Password123' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 4 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  @Matches(/^(?=.*\p{Ll})(?=.*[\p{Lu}\d]).+$/u, {
    message:
      'Пароль должен содержать как минимум два типа символов: строчные, прописные или цифры',
  })
  confirmPassword: string;
}
