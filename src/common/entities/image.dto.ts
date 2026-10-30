import { Expose } from 'class-transformer';

export class Image {
  @Expose()
  image: string;

  @Expose()
  thumbhash: string;
}
