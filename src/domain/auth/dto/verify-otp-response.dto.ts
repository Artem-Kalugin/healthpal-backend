import { Expose } from 'class-transformer';

export class VerifyOtpResponseDto {
  @Expose()
  recoveryToken: string;
}
