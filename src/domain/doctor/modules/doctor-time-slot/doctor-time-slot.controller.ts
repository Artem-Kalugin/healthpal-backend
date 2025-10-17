import {
  Controller,
  Get,
  Query,
  Param,
  SerializeOptions,
} from '@nestjs/common';
import { DoctorTimeSlotService } from './doctor-time-slot.service';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DateWithTimeSlots } from './dto/date-with-time-slots-response.dto';
import { TimeSlotsRangeResponseDto } from './dto/time-slots-range-response.dto';

@ApiTags('Doctors')
@ApiBearerJwtAuth()
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
@Controller('doctors/:doctorId/time-slots')
export class DoctorTimeSlotController {
  constructor(private readonly service: DoctorTimeSlotService) {}

  @Get()
  @ApiOkResponse({ type: DateWithTimeSlots, isArray: true })
  @SerializeOptions({ type: DateWithTimeSlots })
  async getSlots(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const res = await this.service.getSlotsForDoctor(
      doctorId,
      startDate,
      endDate,
    );

    console.log(res[0].slots);
    return res;
  }

  @Get('/range')
  @ApiOkResponse({ type: TimeSlotsRangeResponseDto })
  @SerializeOptions({ type: TimeSlotsRangeResponseDto })
  async getSlotsRange(@Param('doctorId') doctorId: string) {
    return this.service.getSlotsRange(doctorId);
  }
}
