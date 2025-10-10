import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VerifyOtpResponseDto {
  @ApiProperty()
  @Expose()
  recoveryToken: string;
}
