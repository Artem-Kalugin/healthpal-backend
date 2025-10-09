import {
  Controller,
  Body,
  Patch,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  SerializeOptions,
  Get,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarValidator } from 'src/infrastructure/file-storage/image-file-storage.service';
import type { Request } from 'express';
import { ApiBearerJwtAuth } from 'src/common/decorators/api-bearer-auth.decorator';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/types/auth-guard-by-registration-completion.config';

@ApiTags('Users')
@Controller('users')
@ApiBearerJwtAuth()
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('/me')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: UserResponseDto })
  @UseInterceptors(FileInterceptor('avatar'))
  @SerializeOptions({ type: UserResponseDto })
  async updateCurrent(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile(avatarValidator)
    avatar?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return this.usersService.update(
      request.user!.id,
      updateUserDto,
      avatar?.buffer,
    );
  }

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @SerializeOptions({ type: UserResponseDto })
  async getCurrent(@Req() request: Request): Promise<UserResponseDto> {
    return this.usersService.findOne(request.user!.id);
  }
}
