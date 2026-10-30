import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';
import { PHONE_PATTERN } from './login.dto';

export class RequestOtpDto {
  @Matches(PHONE_PATTERN, rule(ValidationCode.PHONE_FORMAT))
  @ApiProperty({
    description: 'Телефон в формате +7...',
    example: '+79323572448',
  })
  phone: string;
}
