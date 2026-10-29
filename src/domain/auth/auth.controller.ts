import {
  Body,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { avatarValidator } from 'src/infrastructure/file-storage/image-file-storage.service';
import type { Request } from 'express';
import { AuthGuardsByRegistration } from 'src/common/config';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @Public()
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const user = await this.usersService.create(createUserDto);

    return this.authService.generateTokens(user, userAgent);
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const userAgent = request.headers['user-agent'] || 'unknown';

    return this.authService.login(loginDto, userAgent);
  }

  @Post('complete-registration')
  @ApiBearerJwtAuth()
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @AuthRegistrationGuardType(AuthGuardsByRegistration.INCOMPLETE_REGISTRATION)
  @SerializeOptions({ type: LoginResponseDto })
  async update(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(avatarValidator)
    avatar?: Express.Multer.File,
  ): Promise<LoginResponseDto> {
    const userId = request.user!.id;

    const updatedUser = await this.usersService.update(
      userId,
      updateUserDto,
      avatar?.buffer,
    );

    return this.authService.generateTokens(
      updatedUser,
      request.headers['user-agent'] || 'unknown',
    );
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async refresh(
    @Body() { userId, refreshToken }: RefreshDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(
      userId,
      request.headers['user-agent'] || 'unknown',
      refreshToken,
    );
  }
}
