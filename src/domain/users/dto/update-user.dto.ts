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
import { Gender } from 'src/entities/user.entity';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['phone', 'password']),
) {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @Allow()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'День рождения должен быть в формате YYYY-MM-DD',
  })
  @ApiProperty({ description: 'Дата рождения', type: String, format: 'date' })
  birthday: string;

  @IsEnum(Gender, {
    message: `Недопустимое значение gender, доступные значения: ${Object.values(Gender).join(', ')}`,
  })
  @IsOptional()
  @ApiProperty({
    description: 'Пол',
    example: Gender.MALE,
    enum: Gender,
    enumName: 'Gender',
  })
  gender: Gender;

  @IsString()
  @IsOptional()
  @Matches(/^[^\s]+$/, {
    message: 'Имя пользователя не может содержать пробелов',
  })
  @MaxLength(32, {
    message: 'Имя пользователя не может быть длиннее 32 символов',
  })
  @ApiPropertyOptional({
    description: 'Никнейм пользователя',
    example: 'user1337',
  })
  nickname?: string;
}
