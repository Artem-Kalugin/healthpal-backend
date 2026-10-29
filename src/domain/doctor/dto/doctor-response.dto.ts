import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DoctorCategoryResponseDto } from '../modules/doctor-category/dto/doctor-category-response.dto';
import { MedicalCenterResponseDto } from 'src/domain/medical-center/dto/medical-center-response.dto';
import { Image } from 'src/common/helpers/image.dto';
import { favoritedByUserPropertyName } from 'src/domain/users/specification/with-user-favorite.specification';

class DoctorResponseDoctorCategoryDto extends PickType(
  DoctorCategoryResponseDto,
  ['type'],
) {}

class DoctorResponseMedicalCenterDto extends PickType(
  MedicalCenterResponseDto,
  ['name', 'address'],
) {}

export class DoctorResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  surname: string;

  @Expose()
  image: Image;

  @Expose()
  rating: number;

  @Expose()
  reviewsCount: number;

  @Expose()
  patientsCount: number;

  @Expose()
  practiceStartYear: number;

  @Expose()
  description: string;

  @Expose()
  @ApiPropertyOptional()
  [favoritedByUserPropertyName]?: boolean;

  @Expose()
  @Type(() => DoctorResponseDoctorCategoryDto)
  @ApiProperty({ type: () => DoctorResponseDoctorCategoryDto })
  category: DoctorResponseDoctorCategoryDto;

  @Expose()
  @Type(() => DoctorResponseMedicalCenterDto)
  @ApiProperty({ type: () => DoctorResponseMedicalCenterDto })
  medicalCenter: DoctorResponseMedicalCenterDto;
}
