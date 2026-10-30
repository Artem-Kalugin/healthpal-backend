import { Transform } from 'class-transformer';
import { IsBoolean, IsString, Matches, ValidateIf } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

/** lat and lon are only meaningful together: passing one makes the other required. */
const hasCoordinate = (dto: GetMedicalCentersDto) =>
  dto.lat !== undefined || dto.lon !== undefined;

const NUMBER_PATTERN = /^[-+]?(?:\d+(\.\d+)?|\.\d+)$/;

export class GetMedicalCentersDto {
  @IsBoolean(rule(ValidationCode.INVALID_BOOLEAN))
  @Transform(({ value }) => value === 'true')
  shouldTake5Only: boolean;

  @ValidateIf(hasCoordinate)
  @IsString(rule(ValidationCode.NOT_STRING))
  @Matches(NUMBER_PATTERN, rule(ValidationCode.NUMBER_FORMAT))
  lat?: string;

  @ValidateIf(hasCoordinate)
  @IsString(rule(ValidationCode.NOT_STRING))
  @Matches(NUMBER_PATTERN, rule(ValidationCode.NUMBER_FORMAT))
  lon?: string;
}
