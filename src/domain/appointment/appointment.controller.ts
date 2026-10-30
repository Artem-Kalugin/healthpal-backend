import { ApiClientContext } from 'src/common/decorators/api-client-context.decorator';
import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
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
import { ApiTags } from '@nestjs/swagger';
import {
  ClientContext,
  type RequestContext,
} from 'src/common/i18n/request-context';
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
  @ApiClientContext()
  @ApiSerialized(AppointmentResponseDto, { created: true })
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateAppointmentDto,
    @ClientContext() context: RequestContext,
  ) {
    return this.appointmentService.bookForUser(userId, dto, context);
  }

  @Get()
  @ApiClientContext()
  @ApiSerialized(AppointmentResponseDto, { paginated: true })
  list(
    @CurrentUserId() userId: string,
    @Query() query: AppointmentQueryDto,
    @ClientContext() context: RequestContext,
  ) {
    return this.appointmentService.getForUser(userId, query, context);
  }

  @Patch(':id/cancel')
  @ApiClientContext()
  @ApiSerialized(AppointmentResponseDto)
  cancel(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @ClientContext() context: RequestContext,
  ) {
    return this.appointmentService.cancelForUser(userId, id, context);
  }

  @Patch(':id/reschedule')
  @ApiClientContext()
  @ApiSerialized(AppointmentResponseDto)
  reschedule(
    @Param('id', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUserId() userId: string,
    @ClientContext() context: RequestContext,
  ) {
    return this.appointmentService.rescheduleForUser(
      userId,
      appointmentId,
      dto.newTimeSlotId,
      context,
    );
  }
}
