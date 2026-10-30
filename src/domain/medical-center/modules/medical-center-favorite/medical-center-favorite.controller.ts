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
import { MedicalCenterResponseDto } from 'src/domain/medical-center/dto/medical-center-response.dto';
import { MedicalCenterFavoriteService } from './medical-center-favorite.service';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';
import { FavoriteMedicalCenterResponseDto } from './dto/favorite-medical-center-response.dto';

@ApiTags('Medical Centers')
@Authenticated()
@Controller('medical-centers')
export class MedicalCenterFavoriteController {
  constructor(private readonly service: MedicalCenterFavoriteService) {}

  @Get('/favorites')
  @ApiSerialized(MedicalCenterResponseDto, { paginated: true })
  listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: MedicalCenterFavoritesQueryDto,
  ) {
    return this.service.findFavoritesForUser(userId, query);
  }

  @Post(':id/favorite')
  @ApiSerialized(FavoriteMedicalCenterResponseDto, {
    created: true,
    description: 'Medical center added to favorites',
  })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: center is already in favorites',
  })
  @ApiNotFoundResponse({
    description: 'MEDICAL_CENTER_NOT_FOUND: center not found',
  })
  addToFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.addToFavoritesForUser(userId, id);
  }

  @Delete(':id/favorite')
  @ApiOkResponse({ description: 'Medical center removed from favorites' })
  removeFromFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeFromFavoritesForUser(userId, id);
  }
}
