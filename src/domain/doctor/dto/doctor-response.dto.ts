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
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  surname: string;

  @ApiProperty()
  @Expose()
  image: Image;

  @Expose()
  @ApiProperty()
  rating: number;

  @Expose()
  @ApiProperty()
  reviewsCount: number;

  @Expose()
  @ApiProperty()
  patientsCount: number;

  @Expose()
  @ApiProperty()
  practiceStartYear: number;

  @Expose()
  @ApiProperty()
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
