import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DoctorCategoryType } from 'src/db/enums';

export class DoctorCategoryResponseDto {
  @Expose()
  @ApiProperty({ enum: DoctorCategoryType, enumName: 'DoctorCategoryType' })
  type: DoctorCategoryType;

  @Expose()
  icon: string;

  @Expose()
  id: string;
}
