import { ApiClientContext } from 'src/common/decorators/api-client-context.decorator';
import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ClientContext,
  type RequestContext,
} from 'src/common/i18n/request-context';
import { DoctorService } from './doctor.service';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';

@ApiTags('Doctors')
@Authenticated()
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('search')
  @ApiClientContext()
  @ApiSerialized(DoctorResponseDto, { paginated: true })
  search(
    @CurrentUserId() userId: string,
    @Query() query: DoctorSearchQueryDto,
    @ClientContext() context: RequestContext,
  ) {
    return this.doctorService.searchForUser(userId, query, context);
  }

  @Get(':id')
  @ApiClientContext()
  @ApiSerialized(DoctorResponseDto)
  getById(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientContext() context: RequestContext,
  ): Promise<DoctorResponseDto> {
    return this.doctorService.findOneForUser(userId, id, context);
  }
}
