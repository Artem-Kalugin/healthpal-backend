import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { ApiBearerJwtAuth } from 'src/common/decorators/api-bearer-auth.decorator';
import { MedicalCenterResponseDto } from './dto/medical-center-response.dto';
import { MedicalCentersService } from './medical-center.service';
import type { Request } from 'express';
import { AuthGuardsByRegistration } from 'src/common/types/auth-guard-by-registration-completion.config';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { GetMedicalCentersDto } from './dto/get-medical-centers.dto';

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

    console.log(lat, lon, shouldTake5Only, query);

    if (lat && lon) {
      const res = await this.service.findWithFavoriteWithDistance(
        userId,
        +lat,
        +lon,
        shouldTake5Only,
      );

      console.log(res.length);
      return res;
    }

    const res = await this.service.findWithFavoriteByRating(
      userId,
      shouldTake5Only,
    );

    console.log(res.length);
    return res;
  }
}
