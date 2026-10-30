import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  Avatar,
  AvatarUpload,
} from 'src/common/helpers/decorators/avatar-upload.decorator';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/domain/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { AuthGuardsByRegistration } from 'src/common/config';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthThrottle } from 'src/common/helpers/decorators/auth-throttle.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiSerialized(LoginResponseDto, { created: true })
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<LoginResponseDto> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @Public()
  @AuthThrottle()
  @ApiSerialized(LoginResponseDto, { created: true })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('complete-registration')
  @AvatarUpload()
  @Authenticated(AuthGuardsByRegistration.INCOMPLETE_REGISTRATION)
  @ApiSerialized(LoginResponseDto, { created: true })
  async completeRegistration(
    @CurrentUserId() userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Avatar() avatar?: Express.Multer.File,
  ): Promise<LoginResponseDto> {
    return this.authService.completeRegistration(
      userId,
      updateUserDto,
      avatar?.buffer,
    );
  }

  @Public()
  @AuthThrottle()
  @Post('refresh')
  @ApiSerialized(LoginResponseDto, { created: true })
  async refresh(
    @Body() { userId, refreshToken }: RefreshDto,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(userId, refreshToken);
  }
}
