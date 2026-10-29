import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class GetMedicalCentersDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  shouldTake5Only: boolean;

  @IsOptional()
  @IsString({ message: 'lat должно быть строкой' })
  @Matches(/^[-+]?(?:\d+(\.\d+)?|\.\d+)$/, {
    message: 'lat должно быть числом',
  })
  lat?: string;

  @IsOptional()
  @IsString({ message: 'lon должно быть строкой' })
  @Matches(/^[-+]?(?:\d+(\.\d+)?|\.\d+)$/, {
    message: 'lat должно быть числом',
  })
  lon?: string;
}
