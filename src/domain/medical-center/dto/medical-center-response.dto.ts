import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Image } from 'src/common/helpers/image.dto';
import { favoritedByUserPropertyName } from 'src/domain/users/specification/with-user-favorite.specification';
import { MedicalCenterType } from 'src/entities/medical-center.entity';

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
  rating: string;

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
  @ApiProperty()
  [favoritedByUserPropertyName]: boolean;

  @Expose()
  distance?: number;

  @Expose()
  walkingTimeMinutes?: number;
}
