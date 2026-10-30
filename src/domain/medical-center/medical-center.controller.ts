import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ClientContext,
  type RequestContext,
} from 'src/common/i18n/request-context';
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
  list(
    @CurrentUserId() userId: string,
    @Query() query: GetMedicalCentersDto,
    @ClientContext() context: RequestContext,
  ) {
    return this.service.findForUser(userId, query, context);
  }
}
