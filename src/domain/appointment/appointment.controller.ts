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
import {
  AppointmentMutationResponseDto,
  AppointmentResponseDto,
} from './dto/appointment-response.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import {
  PaginatedResponseDto,
  PaginatedResponseOf,
} from 'src/common/helpers/pagination/paginated-response.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

const PaginatedAppointmentResponse = PaginatedResponseOf(
  AppointmentResponseDto,
);

@ApiTags('Appointments')
@Authenticated()
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiSerialized(AppointmentMutationResponseDto, { created: true })
  async createAppointment(
    @CurrentUserId() userId: string,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentMutationResponseDto> {
    return await this.appointmentService.createAppointment(userId, dto);
  }

  @Get()
  @ApiSerialized(PaginatedAppointmentResponse, {
    swaggerType: PaginatedResponseDto<AppointmentResponseDto>,
  })
  async getAppointments(
    @CurrentUserId() userId: string,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const result = await this.appointmentService.getAppointmentsForUser(
      userId,
      query,
    );

    return new PaginatedAppointmentResponse(result);
  }

  @Patch(':id/cancel')
  @ApiParam({ name: 'id', type: String })
  @ApiSerialized(AppointmentMutationResponseDto)
  async cancelAppointment(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.appointmentService.cancelAppointment(id, userId);
  }

  @Patch(':id/reschedule')
  @ApiSerialized(AppointmentMutationResponseDto)
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
