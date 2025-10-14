import { Controller, Get, Param, Res } from '@nestjs/common';
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
    const filePath = this.fs.getFilePath(filename, false);
    res.sendFile(filePath);
  }

  @Get('protected/:filename')
  @ApiBearerJwtAuth()
  @AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
  @ApiOkResponse()
  getProtectedFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.fs.getFilePath(filename, true);
    res.sendFile(filePath);
  }
}
