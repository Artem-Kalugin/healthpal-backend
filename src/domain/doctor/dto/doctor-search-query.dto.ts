import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
  MinLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { SortOrder } from 'src/common/config';
import { PaginatedQueryDto } from 'src/common/helpers/pagination/paginated-query.dto';

export class DoctorSearchQueryDto extends PaginatedQueryDto {
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
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Фильтр по медицинскому центру',
  })
  @IsOptional()
  @IsUUID()
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
