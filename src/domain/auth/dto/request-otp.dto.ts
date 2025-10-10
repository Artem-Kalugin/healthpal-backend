import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class RequestOtpDto {
  @Matches(/^\+\d{11}$/, {
    message: 'Телефон должен быть в формате +XXXXXXXXXXX (11 цифр после плюса)',
  })
  @ApiProperty({
    description: 'Телефон в формате +7...',
    example: '+79323572448',
  })
  phone: string;
}
