import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { rule, ValidationCode } from 'src/common/errors/validation-code';
import { PHONE_PATTERN } from './login.dto';

const OTP_LENGTH = 5;

export class VerifyOtpDto {
  @Matches(PHONE_PATTERN, rule(ValidationCode.PHONE_FORMAT))
  @ApiProperty({
    description: 'Phone in the format +7...',
    example: '+79323572448',
  })
  phone: string;

  @Matches(
    new RegExp(`^\\d{${OTP_LENGTH}}$`),
    rule(ValidationCode.OTP_FORMAT, { length: OTP_LENGTH }),
  )
  otp: string;
}
