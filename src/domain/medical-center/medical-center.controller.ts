import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MedicalCenterResponseDto } from './dto/medical-center-response.dto';
import { MedicalCentersService } from './medical-center.service';
import { GetMedicalCentersDto } from './dto/get-medical-centers.dto';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';

@ApiTags('Medical Centers')
@Authenticated()
@Controller('medical-centers')
export class MedicalCentersController {
  constructor(private readonly service: MedicalCentersService) {}

  @Get()
  @ApiSerialized(MedicalCenterResponseDto, { isArray: true })
  async getMedicalCenters(
    @CurrentUserId() userId: string,
    @Query() query: GetMedicalCentersDto,
  ): Promise<MedicalCenterResponseDto[]> {
    const { lat, lon, shouldTake5Only } = query;

    if (lat && lon) {
      const res = await this.service.findWithDistanceForUser(
        userId,
        +lat,
        +lon,
        shouldTake5Only,
      );

      return res;
    }

    const res = await this.service.findByRatingForUser(userId, shouldTake5Only);

    return res;
  }

  @Get('/favorites')
  @ApiSerialized(MedicalCenterResponseDto, { paginated: true })
  async favoritesForUser(
    @CurrentUserId() userId: string,
    @Query() query: MedicalCenterFavoritesQueryDto,
  ) {
    return await this.service.findFavoritesForUser({
      ...query,
      userId,
    });
  }
}
