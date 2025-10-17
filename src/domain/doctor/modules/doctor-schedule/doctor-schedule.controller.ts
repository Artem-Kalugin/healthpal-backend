import { DoctorScheduleResponseDto } from './dto/doctor-schedule-response.dto';
// src/domain/doctor-schedule/doctor-schedule.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { DoctorScheduleService } from './doctor-schedule.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';

@ApiTags('Doctors')
@ApiBearerJwtAuth()
@Controller('doctors/:doctorId/schedule')
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
export class DoctorScheduleController {
  constructor(private readonly service: DoctorScheduleService) {}

  @Get()
  @ApiOkResponse({ type: DoctorScheduleResponseDto })
  getDoctorSchedule(@Param('doctorId') doctorId: string) {
    return this.service.getScheduleByDoctorId(doctorId);
  }
}
