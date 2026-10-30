import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Image } from 'src/common/entities/image.dto';

export class OnboardingSlideResponseDto {
  @ApiProperty({
    description: '{ image: file link, thumbhash: preview hash }',
  })
  @Expose()
  @Type(() => Image)
  image: Image;

  @Expose()
  title: string;

  @Expose()
  text: string;
}
