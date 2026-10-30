import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  Min,
  Max,
  Allow,
} from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

export class CreateOnboardingSlideDto {
  @IsString()
  @MaxLength(128, rule(ValidationCode.TEXT_TOO_LONG, { limit: 128 }))
  title: string;

  @IsString()
  text: string;

  @IsOptional()
  @Min(0, rule(ValidationCode.VALUE_TOO_SMALL, { limit: 0 }))
  @Max(10, rule(ValidationCode.VALUE_TOO_BIG, { limit: 10 }))
  order?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  image?: string;

  @IsOptional()
  isActive?: boolean;
}
