import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty()
  title: string;

  @IsString()
  @ApiProperty()
  text: string;

  @IsOptional()
  @Min(0)
  @Max(10)
  @ApiPropertyOptional()
  order?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  image?: string;

  @IsOptional()
  @ApiPropertyOptional()
  isActive?: boolean;
}
