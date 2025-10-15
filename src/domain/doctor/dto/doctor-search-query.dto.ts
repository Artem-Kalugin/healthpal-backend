import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
  IsIn,
  MinLength,
  IsEnum,
  Max,
} from 'class-validator';
import { SortOrder } from 'src/common/config';

export class DoctorSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы (>=1)',
    example: 1,
    type: 'number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Размер страницы (1–100)',
    example: 10,
    type: 'number',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(10)
  @Max(100)
  size = 10;

  @ApiPropertyOptional({
    description: 'Поисковый запрос (>=3 символов)',
    example: 'Иван',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  searchFor?: string;

  @ApiPropertyOptional({ description: 'Фильтр по категории врача' })
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по медицинскому центру',
  })
  @IsOptional()
  medicalCenterId?: string;

  @ApiPropertyOptional({
    description: 'Поле сортировки',
    enum: ['rating', 'reviews', 'practiceStartYear'],
    example: 'rating',
  })
  @IsOptional()
  @IsIn(['rating', 'reviews', 'practiceStartYear'])
  sort?: 'rating' | 'reviews' | 'practiceStartYear';

  @ApiPropertyOptional({
    description: 'Направление сортировки',
    enum: SortOrder,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
