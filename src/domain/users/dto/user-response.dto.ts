import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/db/enums';
import { Image } from 'src/common/helpers/image.dto';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Имя',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Фамилия',
  })
  @Expose()
  surname: string;

  @ApiProperty({
    description: 'Телефон в формате +7...',
    example: '+79323572448',
  })
  @Expose()
  phone: string;

  @ApiProperty({
    description: 'Никнейм пользователя',
    example: 'user1337',
    nullable: true,
  })
  @Expose()
  nickname: string | null;

  @ApiProperty({
    description: 'Дата рождения',
    example: '2025-10-06',
    type: String,
    format: 'date',
    nullable: true,
  })
  @Expose()
  birthday: Date | null;

  @ApiProperty({
    description: 'Пол',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
    nullable: true,
  })
  @Expose()
  gender: Gender | null;

  @ApiProperty({
    description: 'Аватар: { image: ссылка на файл, thumbhash: хэш превью }',
    nullable: true,
  })
  @Expose()
  avatar: Image | null;

  @ApiProperty({
    description: 'Никнейм пользователя',
    type: 'boolean',
    nullable: true,
  })
  @Expose()
  registrationComplete: boolean | null;
}
