import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MedicalCenterResponseDto } from './dto/medical-center-response.dto';
import { MedicalCenterService } from './medical-center.service';
import { GetMedicalCentersDto } from './dto/get-medical-centers.dto';

@ApiTags('Medical Centers')
@Authenticated()
@Controller('medical-centers')
export class MedicalCenterController {
  constructor(private readonly service: MedicalCenterService) {}

  @Get()
  @ApiSerialized(MedicalCenterResponseDto, { isArray: true })
  async list(
    @CurrentUserId() userId: string,
    @Query() query: GetMedicalCentersDto,
  ) {
    const { lat, lon, shouldTake5Only } = query;

    if (lat && lon) {
      return await this.service.findWithDistanceForUser(
        userId,
        +lat,
        +lon,
        shouldTake5Only,
      );
    }

    return await this.service.findByRatingForUser(userId, shouldTake5Only);
  }
}
