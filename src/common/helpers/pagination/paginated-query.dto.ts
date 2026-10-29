import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class PaginatedQueryDto {
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
    description: 'Размер страницы (10–40)',
    example: 10,
    type: 'number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(40)
  size = 10;
}
