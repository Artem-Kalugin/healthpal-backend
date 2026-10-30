import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { AuthThrottle } from 'src/common/helpers/decorators/auth-throttle.decorator';
import { RecoveryService } from './recovery.service';
import { ApiCreatedResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';
import { VerifyOtpResponseDto } from './dto/verify-otp-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/** This class is used only for swagger documentation, not at runtime */
// eslint-disable-next-line @typescript-eslint/naming-convention, sonarjs/class-name
class DemoOnly_SMSResponse {
  @ApiProperty()
  smsDemoOnly: string;
}
@ApiTags('Auth')
@Public()
@AuthThrottle()
@Controller('auth/recovery')
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @ApiCreatedResponse({ type: DemoOnly_SMSResponse })
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
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.recoveryService.resetPassword(body.token, body.password);
  }
}
