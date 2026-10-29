import { Module } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { DoctorCategoryService } from './modules/doctor-category/doctor-category.service';
import { DoctorCategoryController } from './modules/doctor-category/doctor-category.controller';
import { DoctorScheduleService } from './modules/doctor-schedule/doctor-schedule.service';
import { DoctorScheduleController } from './modules/doctor-schedule/doctor-schedule.controller';
import { DoctorTimeSlotService } from './modules/doctor-time-slot/doctor-time-slot.service';
import { DoctorTimeSlotController } from './modules/doctor-time-slot/doctor-time-slot.controller';

@Module({
  providers: [
    DoctorService,
    DoctorCategoryService,
    DoctorScheduleService,
    DoctorTimeSlotService,
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
