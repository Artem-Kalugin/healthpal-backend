import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import {
  PaginatedResponseDto,
  PaginatedResponseOf,
} from 'src/common/helpers/pagination/paginated-response.dto';
import type { Request } from 'express';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';
import { RescheduleAppointmentDto } from './dto/reshedule-appointment.dto';

const PaginatedAppointmentResponse = PaginatedResponseOf(
  AppointmentResponseDto,
);

@ApiTags('Appointments')
@ApiBearerJwtAuth()
@Controller('appointments')
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  @SerializeOptions({
    type: AppointmentResponseDto,
  })
  async createAppointment(
    @Req() request: Request,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return await this.appointmentService.createAppointment(
      request.user!.id,
      dto,
    );
  }

  @Get()
  @ApiOkResponse({ type: PaginatedResponseDto<AppointmentResponseDto> })
  @SerializeOptions({
    type: PaginatedAppointmentResponse,
  })
  async getAppointments(
    @Req() request: Request,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const result = await this.appointmentService.getAppointmentsForUser(
      request.user!.id,
      query,
    );

    return new PaginatedAppointmentResponse(result);
  }

  @Patch(':id/cancel')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @SerializeOptions({
    type: AppointmentResponseDto,
  })
  async cancelAppointment(@Req() request: Request, @Param('id') id: string) {
    return await this.appointmentService.cancelAppointment(
      id,
      request.user!.id,
    );
  }

  @Patch(':id/reschedule')
  @ApiOkResponse({ type: AppointmentResponseDto })
  @SerializeOptions({
    type: AppointmentResponseDto,
  })
  async rescheduleAppointment(
    @Param('id') appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() request: Request,
  ) {
    return await this.appointmentService.rescheduleAppointment(
      appointmentId,
      request.user!.id,
      dto.newTimeSlotId,
    );
  }
}
