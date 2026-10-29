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
  ): Promise<LoginResponseDto> {
    const user = await this.usersService.create(createUserDto);

    return this.authService.generateTokens(user);
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
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

    return this.authService.generateTokens(updatedUser);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @ApiOkResponse({ type: LoginResponseDto })
  @SerializeOptions({ type: LoginResponseDto })
  async refresh(
    @Body() { userId, refreshToken }: RefreshDto,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(userId, refreshToken);
  }
}
