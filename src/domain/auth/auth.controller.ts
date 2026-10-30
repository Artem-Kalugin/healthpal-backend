import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/domain/users/dto/create-user.dto';
import { UsersService } from 'src/domain/users/users.service';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from 'src/domain/users/dto/update-user.dto';
import { avatarValidator } from 'src/infrastructure/file-storage/image-file-storage.service';
import { AuthGuardsByRegistration } from 'src/common/config';
import { Public } from 'src/common/helpers/decorators/public.decorator';
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
  @ApiSerialized(LoginResponseDto, { created: true })
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
  @ApiSerialized(LoginResponseDto, { created: true })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('complete-registration')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @Authenticated(AuthGuardsByRegistration.INCOMPLETE_REGISTRATION)
  @ApiSerialized(LoginResponseDto, { created: true })
  async update(
    @CurrentUserId() userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(avatarValidator)
    avatar?: Express.Multer.File,
  ): Promise<LoginResponseDto> {
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
  @ApiSerialized(LoginResponseDto, { created: true })
  async refresh(
    @Body() { userId, refreshToken }: RefreshDto,
  ): Promise<LoginResponseDto> {
    return this.authService.refresh(userId, refreshToken);
  }
}
