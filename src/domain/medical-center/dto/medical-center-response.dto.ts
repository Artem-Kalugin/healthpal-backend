import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MedicalCenterType } from 'src/entities/medical-center.entity';

export const MedicalCenterResponseFavoritePropertyName = 'isFavorite';

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
  image: { image: string; thumbhash: string };
  @ApiProperty()
  @Expose()
  lat: number;
  @ApiProperty()
  @Expose()
  lon: number;
  @ApiProperty({ enum: MedicalCenterType, enumName: 'MedicalCenterType' })
  @Expose()
  type: MedicalCenterType;
  [MedicalCenterResponseFavoritePropertyName]: boolean;
  @ApiPropertyOptional()
  @Expose()
  distance?: number;
  @ApiPropertyOptional()
  @Expose()
  walkingTimeMinutes?: number;
}
