import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/helpers/decorators/current-user.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiParam } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@ApiTags('Appointments')
@Authenticated()
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiSerialized(AppointmentResponseDto, { created: true })
  create(@CurrentUserId() userId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointmentService.bookForUser(userId, dto);
  }

  @Get()
  @ApiSerialized(AppointmentResponseDto, { paginated: true })
  list(@CurrentUserId() userId: string, @Query() query: AppointmentQueryDto) {
    return this.appointmentService.getForUser(userId, query);
  }

  @Patch(':id/cancel')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(AppointmentResponseDto)
  cancel(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentService.cancelForUser(userId, id);
  }

  @Patch(':id/reschedule')
  @ApiSerialized(AppointmentResponseDto)
  reschedule(
    @Param('id', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.appointmentService.rescheduleForUser(
      userId,
      appointmentId,
      dto.newTimeSlotId,
    );
  }
}
