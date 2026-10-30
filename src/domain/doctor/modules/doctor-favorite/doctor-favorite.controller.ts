import { ApiClientContext } from 'src/common/decorators/api-client-context.decorator';
import {
  ClientContext,
  type RequestContext,
} from 'src/common/i18n/request-context';
import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
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
  @ApiClientContext()
  @ApiSerialized(DoctorResponseDto, { paginated: true })
  listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: DoctorFavoritesQueryDto,
    @ClientContext() context: RequestContext,
  ) {
    return this.service.findFavoritesForUser(userId, query, context);
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
