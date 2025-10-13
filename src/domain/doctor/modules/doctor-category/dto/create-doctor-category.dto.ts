import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DoctorCategoryType } from 'src/entities/doctor-category.entity';

export class CreateDoctorCategoryDto {
  @IsEnum(DoctorCategoryType)
  type: DoctorCategoryType;

  @IsOptional()
  @IsString()
  icon?: string;
}
