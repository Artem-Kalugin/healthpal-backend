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
  async createAppointment(
    @CurrentUserId() userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return await this.appointmentService.createAppointment(userId, dto);
  }

  @Get()
  @ApiSerialized(AppointmentResponseDto, { paginated: true })
  async getAppointments(
    @CurrentUserId() userId: string,
    @Query() query: AppointmentQueryDto,
  ) {
    return await this.appointmentService.getAppointmentsForUser(userId, query);
  }

  @Patch(':id/cancel')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(AppointmentResponseDto)
  async cancelAppointment(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.appointmentService.cancelAppointment(id, userId);
  }

  @Patch(':id/reschedule')
  @ApiSerialized(AppointmentResponseDto)
  async rescheduleAppointment(
    @Param('id', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUserId() userId: string,
  ) {
    return await this.appointmentService.rescheduleAppointment(
      appointmentId,
      userId,
      dto.newTimeSlotId,
    );
  }
}
