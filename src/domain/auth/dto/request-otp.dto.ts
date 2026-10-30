import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';
import { PHONE_PATTERN } from './login.dto';

export class RequestOtpDto {
  @Matches(PHONE_PATTERN, rule(ValidationCode.PHONE_FORMAT))
  @ApiProperty({
    description: 'Phone in E.164 format, e.g. +79991234567',
    example: '+79323572448',
  })
  phone: string;
}
