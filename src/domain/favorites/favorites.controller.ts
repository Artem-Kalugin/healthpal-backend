import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Post, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { FavoritesService } from './favorites.service';
import { FavoriteDoctorResponseDto } from './dto/favorite-doctor-response.dto';
import { FavoriteMedicalCenterResponseDto } from './dto/favorite-medical-center-response.dto';
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
  @ApiSerialized(FavoriteDoctorResponseDto, {
    created: true,
    description: 'Doctor added to favorites',
  })
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: doctor is already in favorites',
  })
  @ApiNotFoundResponse({ description: 'DOCTOR_NOT_FOUND: doctor not found' })
  async addDoctor(
    @CurrentUserId() userId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.favoritesService.addDoctorToFavorites(userId, doctorId);
  }

  @Delete('doctors/:doctorId')
  @ApiParam({ name: 'doctorId', type: 'string' })
  @ApiOkResponse({ description: 'Doctor removed from favorites' })
  async removeDoctor(
    @CurrentUserId() userId: string,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ) {
    return this.favoritesService.removeDoctorFromFavorites(userId, doctorId);
  }

  @Post('medical-centers/:medicalCenterId')
  @ApiSerialized(FavoriteMedicalCenterResponseDto, {
    created: true,
    description: 'Medical center added to favorites',
  })
  @ApiParam({ name: 'medicalCenterId', type: 'string' })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: center is already in favorites',
  })
  @ApiNotFoundResponse({
    description: 'MEDICAL_CENTER_NOT_FOUND: center not found',
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
  @ApiOkResponse({ description: 'Medical center removed from favorites' })
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
