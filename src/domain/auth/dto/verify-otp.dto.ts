import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^\+\d{11}$/, {
    message: 'Телефон должен быть в формате +XXXXXXXXXXX (11 цифр после плюса)',
  })
  @ApiProperty({
    description: 'Телефон в формате +7...',
    example: '+79323572448',
  })
  phone: string;

  @Matches(/^\d{5}$/, {
    message: 'OTP должен содержать ровно 5 цифр',
  })
  @ApiProperty()
  otp: string;
}
