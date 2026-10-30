import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { DoctorScheduleResponseDto } from './dto/doctor-schedule-response.dto';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DoctorScheduleService } from './doctor-schedule.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Doctors')
@Authenticated()
@Controller('doctors/:doctorId/schedule')
export class DoctorScheduleController {
  constructor(private readonly service: DoctorScheduleService) {}

  @Get()
  @ApiSerialized(DoctorScheduleResponseDto)
  get(@Param('doctorId', ParseUUIDPipe) doctorId: string) {
    return this.service.get(doctorId);
  }
}
