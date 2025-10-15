import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Image } from 'src/common/helpers/image.dto';

export class OnboardingSlideResponseDto {
  @ApiProperty({
    description: '{ image: ссылка на файл, thumbhash: хэш превью }',
  })
  @Expose()
  @Type(() => Image)
  image: Image;

  @Expose()
  @ApiProperty()
  title: string;

  @Expose()
  @ApiProperty()
  text: string;
}
