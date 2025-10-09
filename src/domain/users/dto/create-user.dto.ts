import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Gender, User } from '../../../entities/user.entity';
import {
  Allow,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto extends OmitType(User, [
  'id',
  'avatar',
  'birthday',
] as const) {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  avatar?: string;

  @IsString()
  @Matches(/^[А-Яа-яЁё-]+(?: [А-Яа-яЁё-]+)?$/, {
    message:
      'Имя вместе с фамилией может содержать только буквы кириллицы, дефис и максимум один пробел между словами',
  })
  @MaxLength(32, {
    message: 'Имя вместе с фамилией не может быть длиннее 32 символов',
  })
  fullName: string;

  @Matches(/^\+\d{11}$/, {
    message: 'Телефон должен быть в формате +XXXXXXXXXXX (11 цифр после плюса)',
  })
  phone: string;

  @ApiProperty({ description: 'Пароль пользователя' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 4 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  // eslint-disable-next-line sonarjs/regex-complexity
  @Matches(/^(?:(?=.*[a-z])(?=.*[A-Z])|(?=.*[A-Za-z])(?=.*\d)).+$/, {
    message: 'Пароль должен содержать буквы различного регистра или цифру',
  })
  password: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'День рождения должен быть в формате YYYY-MM-DD',
  })
  @ApiProperty({ description: 'Дата рождения', type: String, format: 'date' })
  birthday: string;

  @IsEnum(Gender, {
    message: `Недопустимое значение gender, доступные значения: ${Object.values(Gender).join(', ')}`,
  })
  gender: Gender;

  @IsString()
  @IsOptional()
  @Matches(/^[^\s]+$/, {
    message: 'Имя пользователя не может содержать пробелов',
  })
  @MaxLength(32, {
    message: 'Имя пользователя не может быть длиннее 32 символов',
  })
  nickname?: string;
}
