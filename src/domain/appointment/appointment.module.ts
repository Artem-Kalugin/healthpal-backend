import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { DoctorModule } from '../doctor/doctor.module';

@Module({
  imports: [DoctorModule],
  providers: [AppointmentService],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
