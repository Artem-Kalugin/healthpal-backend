import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class GetMedicalCentersDto {
  @IsBoolean()
  @ApiProperty()
  @Transform(({ value }) => value === 'true')
  shouldTake5Only: boolean;

  @IsOptional()
  @IsString({ message: 'lat должно быть строкой' })
  @Matches(/^[-+]?(?:\d+(\.\d+)?|\.\d+)$/, {
    message: 'lat должно быть числом',
  })
  @ApiPropertyOptional()
  lat?: string;

  @IsOptional()
  @IsString({ message: 'lon должно быть строкой' })
  @Matches(/^[-+]?(?:\d+(\.\d+)?|\.\d+)$/, {
    message: 'lat должно быть числом',
  })
  @ApiPropertyOptional()
  lon?: string;
}
