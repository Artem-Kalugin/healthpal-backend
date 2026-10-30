import { applyDecorators, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { avatarValidator } from 'src/infrastructure/file-storage/image-file-storage.service';

/** Multipart endpoint with an optional `avatar` file. Read it with `@Avatar()`. */
export const AvatarUpload = () =>
  applyDecorators(
    ApiConsumes('multipart/form-data'),
    UseInterceptors(FileInterceptor('avatar')),
  );

export const Avatar = () => UploadedFile(avatarValidator);
