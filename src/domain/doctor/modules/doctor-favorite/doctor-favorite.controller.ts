import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DoctorResponseDto } from 'src/domain/doctor/dto/doctor-response.dto';
import { DoctorFavoriteService } from './doctor-favorite.service';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';
import { FavoriteDoctorResponseDto } from './dto/favorite-doctor-response.dto';

@ApiTags('Doctors')
@Authenticated()
@Controller('doctors')
export class DoctorFavoriteController {
  constructor(private readonly service: DoctorFavoriteService) {}

  @Get('/favorites')
  @ApiSerialized(DoctorResponseDto, { paginated: true })
  listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: DoctorFavoritesQueryDto,
  ) {
    return this.service.findFavoritesForUser(userId, query);
  }

  @Post(':id/favorite')
  @ApiSerialized(FavoriteDoctorResponseDto, {
    created: true,
    description: 'Doctor added to favorites',
  })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: doctor is already in favorites',
  })
  @ApiNotFoundResponse({ description: 'DOCTOR_NOT_FOUND: doctor not found' })
  addToFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.addToFavoritesForUser(userId, id);
  }

  @Delete(':id/favorite')
  @ApiOkResponse({ description: 'Doctor removed from favorites' })
  removeFromFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeFromFavoritesForUser(userId, id);
  }
}
