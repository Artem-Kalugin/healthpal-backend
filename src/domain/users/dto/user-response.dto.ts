import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../entities/user.entity';
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

  @ApiPropertyOptional({
    description: 'Никнейм пользователя',
    example: 'user1337',
  })
  @Expose()
  nickname?: string;

  @ApiProperty({
    description: 'Дата рождения',
    example: '2025-10-06',
    type: String,
    format: 'date',
  })
  @Expose()
  birthday: Date;

  @ApiProperty({
    description: 'Пол',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
  })
  @Expose()
  gender: Gender;

  @ApiPropertyOptional({
    description: 'Аватар: { image: ссылка на файл, thumbhash: хэш превью }',
  })
  @Expose()
  avatar?: Image;

  @ApiProperty({
    description: 'Никнейм пользователя',
    type: 'boolean',
  })
  @Expose()
  registrationComplete: boolean;
}
