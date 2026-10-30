import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Post, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import {
  ApiTags,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Favorites')
@Authenticated()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('doctors/:doctorId')
  @ApiOkResponse({ description: 'Доктор добавлен в избранное' })
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: доктор уже в избранном',
  })
  @ApiNotFoundResponse({ description: 'DOCTOR_NOT_FOUND: доктор не найден' })
  async addDoctor(
    @CurrentUserId() userId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.favoritesService.addDoctorToFavorites(userId, doctorId);
  }

  @Delete('doctors/:doctorId')
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiOkResponse({ description: 'Доктор удалён из избранного' })
  async removeDoctor(
    @CurrentUserId() userId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.favoritesService.removeDoctorFromFavorites(userId, doctorId);
  }

  @Post('medical-centers/:medicalCenterId')
  @ApiOkResponse({ description: 'Медицинский центр добавлен в избранное' })
  @ApiParam({ name: 'medicalCenterId', type: 'string' })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: центр уже в избранном',
  })
  @ApiNotFoundResponse({
    description: 'MEDICAL_CENTER_NOT_FOUND: центр не найден',
  })
  async addMedicalCenter(
    @CurrentUserId() userId: string,
    @Param('medicalCenterId', ParseUUIDPipe) medicalCenterId: string,
  ) {
    return this.favoritesService.addMedicalCenterToFavorites(
      userId,
      medicalCenterId,
    );
  }

  @Delete('medical-centers/:medicalCenterId')
  @ApiOkResponse({ description: 'Медицинский центр удалён из избранного' })
  @ApiParam({ name: 'medicalCenterId', type: 'string' })
  async removeMedicalCenter(
    @CurrentUserId() userId: string,
    @Param('medicalCenterId', ParseUUIDPipe) medicalCenterId: string,
  ) {
    return this.favoritesService.removeMedicalCenterFromFavorites(
      userId,
      medicalCenterId,
    );
  }
}
