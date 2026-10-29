import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Image } from 'src/common/helpers/image.dto';
import { favoritedByUserPropertyName } from 'src/domain/users/specification/with-user-favorite.specification';
import { MedicalCenterType } from 'src/entities/medical-center.entity';

export class MedicalCenterResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  address: string;

  @ApiProperty()
  @Expose()
  city: string;

  @ApiProperty()
  @Expose()
  reviewsCount: string;

  @ApiProperty()
  @Expose()
  rating: string;

  @ApiProperty()
  @Expose()
  image: Image;

  @ApiProperty()
  @Expose()
  lat: number;

  @ApiProperty()
  @Expose()
  lon: number;

  @ApiProperty({ enum: MedicalCenterType, enumName: 'MedicalCenterType' })
  @Expose()
  type: MedicalCenterType;

  @ApiProperty()
  @Expose()
  [favoritedByUserPropertyName]: boolean;

  @ApiPropertyOptional()
  @Expose()
  distance?: number;

  @ApiPropertyOptional()
  @Expose()
  walkingTimeMinutes?: number;
}
