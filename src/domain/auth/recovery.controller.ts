import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RecoveryService } from './recovery.service';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/** Этот класс используется только для swagger-документации, а не в runtime */
// eslint-disable-next-line @typescript-eslint/naming-convention, sonarjs/class-name
class DemoOnly_SMSResponse {
  @ApiProperty()
  smsDemoOnly: string;
}
@ApiTags('Auth')
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth/recovery')
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @ApiOkResponse({ type: DemoOnly_SMSResponse })
  @Post('otp/request')
  requestOtp(@Body() body: RequestOtpDto) {
    return this.recoveryService.requestOtp(body.phone);
  }

  @Post('otp/verify')
  @ApiSerialized(VerifyOtpResponseDto, { created: true })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.recoveryService.verifyOtp(body.phone, body.otp);
  }

  @Post('reset-password')
  @ApiSerialized(LoginResponseDto, { created: true })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const { token, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new AppException(ErrorCode.PASSWORDS_MISMATCH);
    }

    return this.recoveryService.resetPassword(token, password);
  }
}
