import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';

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

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(DoctorResponseDto)
  async getById(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DoctorResponseDto> {
    return await this.doctorService.findOneForUser(userId, id);
  }
}
