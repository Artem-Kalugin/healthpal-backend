import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import { Controller, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { DoctorTimeSlotService } from './doctor-time-slot.service';
import { ApiTags } from '@nestjs/swagger';
import { DateWithTimeSlots } from './dto/date-with-time-slots-response.dto';
import { TimeSlotsQueryDto } from './dto/time-slots-query.dto';
import { TimeSlotsRangeResponseDto } from './dto/time-slots-range-response.dto';

@ApiTags('Doctors')
@Authenticated()
@Controller('doctors/:doctorId/time-slots')
export class DoctorTimeSlotController {
  constructor(private readonly service: DoctorTimeSlotService) {}

  @Get()
  @ApiSerialized(DateWithTimeSlots, { isArray: true })
  async getSlots(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query() { startDate, endDate }: TimeSlotsQueryDto,
  ) {
    return this.service.getSlotsForDoctor(doctorId, startDate, endDate);
  }

  @Get('/range')
  @ApiSerialized(TimeSlotsRangeResponseDto)
  async getSlotsRange(@Param('doctorId', ParseUUIDPipe) doctorId: string) {
    return this.service.getSlotsRange(doctorId);
  }
}
