import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { LoginDto } from 'src/domain/auth/dto/login.dto';

export class CreateUserDto extends LoginDto {
  @IsString()
  @Matches(/^[А-Яа-яЁё-]+(?: [А-Яа-яЁё-]+)?$/, {
    message:
      'Имя вместе с фамилией может содержать только буквы кириллицы, дефис и максимум один пробел между словами',
  })
  @MaxLength(32, {
    message: 'Имя вместе с фамилией не может быть длиннее 32 символов',
  })
  @ApiProperty({
    description: 'Имя и фамилия пользователя',
    example: 'Пользователь Приложения',
  })
  fullName: string;
}
