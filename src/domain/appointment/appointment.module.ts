import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { createSafeRepositoryProviders } from '../../common/helpers/safe-repository.provider';
import { Appointment } from '../../entities/appointment.entity';
import { DoctorModule } from '../doctor/doctor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, DoctorTimeSlot, Doctor]),
    DoctorModule,
  ],
  providers: [
    AppointmentService,
    ...createSafeRepositoryProviders([Appointment, DoctorTimeSlot, Doctor]),
  ],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
