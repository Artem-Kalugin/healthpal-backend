import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

export class PaginatedQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (>=1)',
    example: 1,
    type: 'number',
  })
  @Type(() => Number)
  @IsInt(rule(ValidationCode.INVALID_INTEGER))
  @Min(1, rule(ValidationCode.VALUE_TOO_SMALL, { limit: 1 }))
  page = 1;

  @ApiPropertyOptional({
    description: 'Page size (10–40)',
    example: 10,
    type: 'number',
  })
  @Type(() => Number)
  @IsInt(rule(ValidationCode.INVALID_INTEGER))
  @Min(10, rule(ValidationCode.VALUE_TOO_SMALL, { limit: 10 }))
  @Max(40, rule(ValidationCode.VALUE_TOO_BIG, { limit: 40 }))
  size = 10;
}
