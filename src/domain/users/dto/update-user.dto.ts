import {
  Allow,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Gender } from 'src/db/enums';
import { rule, ValidationCode } from 'src/common/errors/validation-code';

const NICKNAME_MAX = 32;

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['phone', 'password']),
) {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  avatar?: string;

  @IsString(rule(ValidationCode.NOT_STRING))
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, rule(ValidationCode.DATE_FORMAT))
  @ApiProperty({ description: 'Дата рождения', type: String, format: 'date' })
  birthday: string;

  @IsEnum(Gender, rule(ValidationCode.INVALID_ENUM))
  @IsOptional()
  @ApiProperty({
    description: 'Пол',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
  })
  gender: Gender;

  @IsString(rule(ValidationCode.NOT_STRING))
  @IsOptional()
  @Matches(/^[^\s]+$/, rule(ValidationCode.NICKNAME_HAS_SPACES))
  @MaxLength(
    NICKNAME_MAX,
    rule(ValidationCode.TEXT_TOO_LONG, { limit: NICKNAME_MAX }),
  )
  @ApiPropertyOptional({
    description: 'Никнейм пользователя',
    example: 'user1337',
  })
  nickname?: string;
}
