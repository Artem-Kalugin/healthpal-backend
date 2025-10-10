import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuardsByRegistration } from 'src/common/types/auth-guard-by-registration-completion.config';
import { FileStorageService } from './file-storage.service';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiBearerJwtAuth } from 'src/common/decorators/api-bearer-auth.decorator';

@ApiTags()
@Controller('uploads')
export class AssetsController {
  constructor(private readonly fs: FileStorageService) {}

  @Get('public/:filename')
  @ApiOkResponse()
  @Public()
  getPublicFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = this.fs.getFilePath(filename, false); // false для protected
      res.sendFile(filePath);
    } catch (error) {
      console.log(
        'internal file error',
        // eslint-disable-next-line
        //TODO: internal file service error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'message' in error && typeof error.message == 'string'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            error.message
          : undefined,
      );
      throw new NotFoundException();
    }
  }

  // Protected
  @Get('protected/:filename')
  @ApiBearerJwtAuth()
  @AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
  @ApiOkResponse()
  // eslint-disable-next-line sonarjs/no-identical-functions
  getProtectedFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = this.fs.getFilePath(filename, false); // false для protected
      res.sendFile(filePath);
    } catch (error) {
      console.log(
        'internal file error',
        // eslint-disable-next-line
        //TODO: internal file service error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'message' in error && typeof error.message == 'string'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            error.message
          : undefined,
      );
      throw new NotFoundException();
    }
  }
}
