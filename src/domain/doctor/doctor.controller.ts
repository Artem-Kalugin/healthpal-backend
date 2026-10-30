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
import { DoctorService } from './doctor.service';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';
import { FavoriteDoctorResponseDto } from './dto/favorite-doctor-response.dto';

@ApiTags('Doctors')
@Authenticated()
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('search')
  @ApiSerialized(DoctorResponseDto, { paginated: true })
  async search(
    @CurrentUserId() userId: string,
    @Query() query: DoctorSearchQueryDto,
  ) {
    return await this.doctorService.searchForUser(userId, query);
  }

  @Get('/favorites')
  @ApiSerialized(DoctorResponseDto, { paginated: true })
  async listFavorites(
    @CurrentUserId() userId: string,
    @Query() query: DoctorFavoritesQueryDto,
  ) {
    return await this.doctorService.findFavoritesForUser(userId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(DoctorResponseDto)
  async getById(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DoctorResponseDto> {
    return await this.doctorService.findOneForUser(userId, id);
  }

  @Post(':id/favorite')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(FavoriteDoctorResponseDto, {
    created: true,
    description: 'Doctor added to favorites',
  })
  @ApiConflictResponse({
    description: 'FAVORITE_ALREADY_EXISTS: doctor is already in favorites',
  })
  @ApiNotFoundResponse({ description: 'DOCTOR_NOT_FOUND: doctor not found' })
  async addToFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.doctorService.addToFavoritesForUser(userId, id);
  }

  @Delete(':id/favorite')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Doctor removed from favorites' })
  async removeFromFavorites(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.doctorService.removeFromFavoritesForUser(userId, id);
  }
}
