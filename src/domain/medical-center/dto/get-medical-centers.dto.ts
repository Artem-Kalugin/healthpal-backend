import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

const NUMBER_PATTERN = /^[-+]?(?:\d+(\.\d+)?|\.\d+)$/;

export class GetMedicalCentersDto {
  @IsBoolean(rule(ValidationCode.INVALID_BOOLEAN))
  @Transform(({ value }) => value === 'true')
  shouldTake5Only: boolean;

  @IsOptional()
  @IsString(rule(ValidationCode.NOT_STRING))
  @Matches(NUMBER_PATTERN, rule(ValidationCode.NUMBER_FORMAT))
  lat?: string;

  @IsOptional()
  @IsString(rule(ValidationCode.NOT_STRING))
  @Matches(NUMBER_PATTERN, rule(ValidationCode.NUMBER_FORMAT))
  lon?: string;
}
