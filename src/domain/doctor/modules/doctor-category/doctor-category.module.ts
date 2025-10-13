import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorCategory } from 'src/entities/doctor-category.entity';
import { DoctorCategoryService } from './doctor-category.service';
import { DoctorCategoryController } from './doctor-category.controller';
import { createSafeRepositoryProviders } from 'src/common/providers/safe-repository.provider';

const DoctorCategoryEntities = [DoctorCategory];

@Module({
  imports: [TypeOrmModule.forFeature(DoctorCategoryEntities)],
  providers: [
    DoctorCategoryService,
    ...createSafeRepositoryProviders(DoctorCategoryEntities),
  ],
  controllers: [DoctorCategoryController],
  exports: [DoctorCategoryService],
})
export class DoctorCategoryModule {}
