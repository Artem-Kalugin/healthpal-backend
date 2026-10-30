import { IsString, IsUUID } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

export class RefreshDto {
  @IsUUID(undefined, rule(ValidationCode.INVALID_UUID))
  userId: string;

  @IsString(rule(ValidationCode.NOT_STRING))
  refreshToken: string;
}
