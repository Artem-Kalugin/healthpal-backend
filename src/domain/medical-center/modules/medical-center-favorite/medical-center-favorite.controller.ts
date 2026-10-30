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
  ApiParam,
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
  async listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: MedicalCenterFavoritesQueryDto,
  ) {
    return await this.service.findFavoritesForUser(userId, query);
  }

  @Post(':id/favorite')
  @ApiParam({ name: 'id', type: String })
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
  async addToFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.service.addToFavoritesForUser(userId, id);
  }

  @Delete(':id/favorite')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Medical center removed from favorites' })
  async removeFromFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.service.removeFromFavoritesForUser(userId, id);
  }
}
