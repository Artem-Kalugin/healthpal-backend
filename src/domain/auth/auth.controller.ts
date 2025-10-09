import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  Req,
  SerializeOptions,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { avatarValidator } from 'src/infrastructure/file-storage/image-file-storage.service';
import type { Request } from 'express';
import { AuthGuardsByRegistration } from 'src/common/types/auth-guard-by-registration-completion.config';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiBearerJwtAuth } from 'src/common/decorators/api-bearer-auth.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @Public()
  @ApiCreatedResponse({ type: UserResponseDto })
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const user = await this.usersService.create(createUserDto);

    const loginDto = {
      phone: createUserDto.phone,
      password: createUserDto.password,
    };

    return await this.authService.login(loginDto, user);
  }

  @Post('login')
  @Public()
  @ApiCreatedResponse({
    type: Object,
    description: '{ accessToken: string, user: UserResponseDto }',
  })
  @ApiUnauthorizedResponse({ description: 'Неверный телефон или пароль' })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    return await this.authService.login(loginDto);
  }

  @Post('complete-registration')
  @ApiBearerJwtAuth()
  @ApiCreatedResponse({
    type: Object,
    description: '{ accessToken: string; user: UserResponseDto }',
  })
  @ApiUnauthorizedResponse({
    description: 'Регистрация уже завершена или недействительный токен',
  })
  @SerializeOptions({ type: UserResponseDto })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @AuthRegistrationGuardType(AuthGuardsByRegistration.INCOMPLETE_REGISTRATION)
  async update(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(avatarValidator)
    avatar?: Express.Multer.File,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const userId = request.user!.id;

    const updatedUser = await this.usersService.update(
      userId,
      updateUserDto,
      avatar?.buffer,
    );

    const loginDto = {
      phone: updatedUser.phone,
      password: updatedUser.password,
    };

    return await this.authService.login(loginDto);
  }
}
