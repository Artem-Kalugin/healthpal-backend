import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Image } from 'src/common/helpers/image.dto';
import { MedicalCenterType } from 'src/db/enums';

export class MedicalCenterResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  address: string;

  @Expose()
  city: string;

  @Expose()
  reviewsCount: string;

  @Expose()
  rating: string | null;

  @Expose()
  image: Image;

  @Expose()
  lat: number;

  @Expose()
  lon: number;

  @ApiProperty({ enum: MedicalCenterType, enumName: 'MedicalCenterType' })
  @Expose()
  type: MedicalCenterType;

  @Expose()
  isFavorite: boolean;

  @Expose()
  distance?: number;

  @Expose()
  walkingTimeMinutes?: number;
}
