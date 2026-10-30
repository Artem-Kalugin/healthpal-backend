import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/db/enums';
import { Image } from 'src/common/helpers/image.dto';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @ApiProperty({
    description: 'First name',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Last name',
  })
  @Expose()
  surname: string;

  @ApiProperty({
    description: 'Phone in the format +7...',
    example: '+79323572448',
  })
  @Expose()
  phone: string;

  @ApiProperty({
    description: 'User nickname',
    example: 'user1337',
    nullable: true,
  })
  @Expose()
  nickname: string | null;

  @ApiProperty({
    description: 'Birth date',
    example: '2025-10-06',
    type: String,
    format: 'date',
    nullable: true,
  })
  @Expose()
  birthday: Date | null;

  @ApiProperty({
    description: 'Gender',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
    nullable: true,
  })
  @Expose()
  gender: Gender | null;

  @ApiProperty({
    description: 'Avatar: { image: file link, thumbhash: preview hash }',
    nullable: true,
  })
  @Expose()
  avatar: Image | null;

  @ApiProperty({
    description: 'User nickname',
    type: 'boolean',
    nullable: true,
  })
  @Expose()
  registrationComplete: boolean | null;
}
