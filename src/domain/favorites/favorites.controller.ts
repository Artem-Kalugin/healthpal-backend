import { Controller, Post, Delete, Param, Req } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';
import {
  ApiTags,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';

@ApiTags('Favorites')
@ApiBearerJwtAuth()
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('doctors/:doctorId')
  @ApiOkResponse({ description: 'Доктор добавлен в избранное' })
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiConflictResponse({ description: 'Доктор уже в избранном' })
  @ApiNotFoundResponse({ description: 'Доктор не найден' })
  async addDoctor(
    @Req() request: Request,
    @Param('doctorId') doctorId: string,
  ) {
    return this.favoritesService.addDoctorToFavorites(
      request.user!.id,
      doctorId,
    );
  }

  @Delete('doctors/:doctorId')
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiOkResponse({ description: 'Доктор удалён из избранного' })
  async removeDoctor(
    @Req() request: Request,
    @Param('doctorId') doctorId: string,
  ) {
    return this.favoritesService.removeDoctorFromFavorites(
      request.user!.id,
      doctorId,
    );
  }

  @Post('medical-centers/:medicalCenterId')
  @ApiOkResponse({ description: 'Медицинский центр добавлен в избранное' })
  @ApiParam({ name: 'medicalCenterId', type: 'string' })
  @ApiConflictResponse({ description: 'Медицинский центр уже в избранном' })
  @ApiNotFoundResponse({ description: 'Медицинский центр не найден' })
  async addMedicalCenter(
    @Req() request: Request,
    @Param('medicalCenterId') medicalCenterId: string,
  ) {
    return this.favoritesService.addMedicalCenterToFavorites(
      request.user!.id,
      medicalCenterId,
    );
  }

  @Delete('medical-centers/:medicalCenterId')
  @ApiOkResponse({ description: 'Медицинский центр удалён из избранного' })
  @ApiParam({ name: 'medicalCenterId', type: 'string' })
  async removeMedicalCenter(
    @Req() request: Request,
    @Param('medicalCenterId') medicalCenterId: string,
  ) {
    return this.favoritesService.removeMedicalCenterFromFavorites(
      request.user!.id,
      medicalCenterId,
    );
  }
}
