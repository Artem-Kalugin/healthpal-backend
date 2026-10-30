import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';
import { SortOrder } from 'src/common/config';
import { PaginatedQueryDto } from 'src/common/pagination/paginated-query.dto';

export enum DoctorSort {
  RATING = 'rating',
  REVIEWS = 'reviews',
  PRACTICE_START_YEAR = 'practiceStartYear',
}

export class DoctorSearchQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (>=3 characters)',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, rule(ValidationCode.TEXT_TOO_SHORT, { limit: 3 }))
  @MaxLength(100, rule(ValidationCode.TEXT_TOO_LONG, { limit: 100 }))
  searchFor?: string;

  @ApiPropertyOptional({ description: 'Doctor category filter' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Medical center filter',
  })
  @IsOptional()
  @IsUUID()
  medicalCenterId?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: DoctorSort,
    enumName: 'DoctorSort',
    example: 'rating',
  })
  @IsOptional()
  @IsEnum(DoctorSort)
  sort?: DoctorSort;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
