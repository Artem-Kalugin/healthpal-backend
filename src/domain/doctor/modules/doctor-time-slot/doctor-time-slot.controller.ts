import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
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
  async list(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query() { startDate, endDate }: TimeSlotsQueryDto,
  ) {
    return this.service.getAvailable(doctorId, startDate, endDate);
  }

  @Get('/range')
  @ApiSerialized(TimeSlotsRangeResponseDto)
  async getRange(@Param('doctorId', ParseUUIDPipe) doctorId: string) {
    return this.service.getAvailableRange(doctorId);
  }
}
