import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
import { Controller, Body, Patch, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  Avatar,
  AvatarUpload,
} from 'src/infrastructure/file-storage/helpers/avatar-upload.decorator';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';

@ApiTags('Users')
@Controller('users')
@Authenticated()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('/me')
  @AvatarUpload()
  @ApiSerialized(UserResponseDto)
  async updateCurrent(
    @CurrentUserId() userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Avatar() avatar?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return this.usersService.update(userId, updateUserDto, avatar?.buffer);
  }

  @Get('me')
  @ApiSerialized(UserResponseDto)
  @ApiNotFoundResponse({
    description: 'USER_NOT_FOUND: user not found',
  })
  @AuthRegistrationGuardType(AuthGuardsByRegistration.ANY)
  async getCurrent(@CurrentUserId() userId: string): Promise<UserResponseDto> {
    return this.usersService.findById(userId);
  }
}
