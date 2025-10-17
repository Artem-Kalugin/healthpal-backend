// doctor.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from 'src/entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { createSafeRepositoryProviders } from 'src/common/helpers/safe-repository.provider';
import { DoctorCategory } from 'src/entities/doctor-category.entity';
import { DoctorCategoryService } from './modules/doctor-category/doctor-category.service';
import { DoctorCategoryController } from './modules/doctor-category/doctor-category.controller';
import { DoctorSchedule } from 'src/entities/doctor-schedule.entity';
import { DoctorScheduleService } from './modules/doctor-schedule/doctor-schedule.service';
import { DoctorScheduleController } from './modules/doctor-schedule/doctor-schedule.controller';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { DoctorTimeSlotService } from './modules/doctor-time-slot/doctor-time-slot.service';
import { DoctorTimeSlotController } from './modules/doctor-time-slot/doctor-time-slot.controller';

const DoctorEntities = [Doctor, DoctorCategory, DoctorSchedule, DoctorTimeSlot];

@Module({
  imports: [TypeOrmModule.forFeature(DoctorEntities)],
  providers: [
    DoctorService,
    DoctorCategoryService,
    DoctorScheduleService,
    DoctorTimeSlotService,
    ...createSafeRepositoryProviders(DoctorEntities),
  ],
  controllers: [
    DoctorController,
    DoctorTimeSlotController,
    DoctorCategoryController,
    DoctorScheduleController,
  ],
  exports: [
    DoctorService,
    DoctorCategoryService,
    DoctorScheduleService,
    DoctorTimeSlotService,
  ],
})
export class DoctorModule {}
