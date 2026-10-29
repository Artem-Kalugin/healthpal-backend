import {
  Body,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RecoveryService } from './recovery.service';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthError } from 'src/common/errors/auth.error';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { Request } from 'express';

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

  @ApiOkResponse({ type: VerifyOtpResponseDto })
  @Post('otp/verify')
  @SerializeOptions({ type: VerifyOtpResponseDto })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.recoveryService.verifyOtp(body.phone, body.otp);
  }

  @Post('reset-password')
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async resetPassword(@Body() body: ResetPasswordDto, @Req() request: Request) {
    const { token, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new AuthError('Пароли не совпадают');
    }

    const userAgent = request.headers['user-agent'] || 'unknown';

    return this.recoveryService.resetPassword(token, password, userAgent);
  }
}
