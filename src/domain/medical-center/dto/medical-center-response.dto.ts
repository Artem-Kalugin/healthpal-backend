import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { Image } from 'src/common/entities/image.dto';
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

  // the aggregate is read from the DB as a string
  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  @Transform(({ value }: { value: string | null }) =>
    value === null ? null : Number(value),
  )
  rating: number | null;

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
