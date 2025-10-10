import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class Image {
  @ApiProperty()
  @Expose()
  image: string;

  @ApiProperty()
  @Expose()
  thumbhash: string;
}
