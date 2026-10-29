import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  Min,
  Max,
  Allow,
} from 'class-validator';

export class CreateOnboardingSlideDto {
  @IsString()
  @MaxLength(128)
  title: string;

  @IsString()
  text: string;

  @IsOptional()
  @Min(0)
  @Max(10)
  order?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  image?: string;

  @IsOptional()
  isActive?: boolean;
}
