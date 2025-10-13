import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DoctorCategoryType } from 'src/entities/doctor-category.entity';

export class DoctorCategoryResponseDto {
  @Expose()
  @ApiProperty({ enum: DoctorCategoryType, enumName: 'DoctorCategoryType' })
  type: DoctorCategoryType;

  @Expose()
  @ApiPropertyOptional()
  icon?: string;
}
