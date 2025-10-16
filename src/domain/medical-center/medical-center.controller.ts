import { Controller, Get, Query, Req, SerializeOptions } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';
import { MedicalCenterResponseDto } from './dto/medical-center-response.dto';
import { MedicalCentersService } from './medical-center.service';
import type { Request } from 'express';
import { AuthGuardsByRegistration } from 'src/common/config';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
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
@ApiBearerJwtAuth()
@Controller('medical-centers')
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
export class MedicalCentersController {
  constructor(private readonly service: MedicalCentersService) {}

  @Get()
  @ApiOkResponse({ type: MedicalCenterResponseDto, isArray: true })
  async getMedicalCenters(
    @Req() request: Request,
    @Query() query: GetMedicalCentersDto,
  ): Promise<MedicalCenterResponseDto[]> {
    const { lat, lon, shouldTake5Only } = query;
    const userId = request.user!.id;

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
  @ApiOkResponse({ type: PaginatedResponseDto<MedicalCenterResponseDto> })
  @SerializeOptions({
    type: PaginatedMedicalCenterResponse,
  })
  async favoritesForUser(
    @Req() request: Request,
    @Query() query: MedicalCenterFavoritesQueryDto,
  ): Promise<PaginatedResponseDto<MedicalCenterResponseDto>> {
    const result = await this.service.findFavoritesForUser({
      ...query,
      userId: request.user!.id,
    });
    console.log(result);

    return new PaginatedMedicalCenterResponse(result);
  }
}
