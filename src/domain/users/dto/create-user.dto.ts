import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength, MinLength } from 'class-validator';
import { LoginDto } from 'src/domain/auth/dto/login.dto';

export class CreateUserDto extends LoginDto {
  @ApiProperty()
  @MaxLength(16, {
    message: 'Имя не может быть длинее 16 символов',
  })
  @MinLength(2, {
    message: 'Имя не может быть короче 2 символов',
  })
  @Matches(/^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/, {
    message: 'Имя может содержать только буквы кириллицы и дефис внутри слова',
  })
  name: string;

  @ApiProperty()
  @MaxLength(16, {
    message: 'Фамилия не может быть длинее 16 символов',
  })
  @MinLength(2, {
    message: 'Фамилия не может быть короче 2 символов',
  })
  @Matches(/^[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*$/, {
    message:
      'Фамилия может содержать только буквы кириллицы и дефис внутри слова',
  })
  surname: string;
}
