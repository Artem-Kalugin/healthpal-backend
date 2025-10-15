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

const DoctorEntities = [Doctor, DoctorCategory];

@Module({
  imports: [TypeOrmModule.forFeature(DoctorEntities)],
  providers: [
    DoctorService,
    DoctorCategoryService,
    ...createSafeRepositoryProviders(DoctorEntities),
  ],
  controllers: [DoctorController, DoctorCategoryController],
  exports: [DoctorService, DoctorCategoryService],
})
export class DoctorModule {}
