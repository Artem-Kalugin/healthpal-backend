import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { MedicalCenterResponseDto } from './dto/medical-center-response.dto';
import { MedicalCentersService } from './medical-center.service';
import { GetMedicalCentersDto } from './dto/get-medical-centers.dto';
import {
  PaginatedResponseDto,
  PaginatedResponseOf,
} from 'src/common/helpers/pagination/paginated-response.dto';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';

const PaginatedMedicalCenterResponse = PaginatedResponseOf(
  MedicalCenterResponseDto,
);

@ApiTags('Medical Centers')
@Authenticated()
@Controller('medical-centers')
export class MedicalCentersController {
  constructor(private readonly service: MedicalCentersService) {}

  @Get()
  @ApiOkResponse({ type: MedicalCenterResponseDto, isArray: true })
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
  @ApiSerialized(PaginatedMedicalCenterResponse, {
    swaggerType: PaginatedResponseDto<MedicalCenterResponseDto>,
  })
  async favoritesForUser(
    @CurrentUserId() userId: string,
    @Query() query: MedicalCenterFavoritesQueryDto,
  ): Promise<PaginatedResponseDto<MedicalCenterResponseDto>> {
    const result = await this.service.findFavoritesForUser({
      ...query,
      userId,
    });

    return new PaginatedMedicalCenterResponse(result);
  }
}
