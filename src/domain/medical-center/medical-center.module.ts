import { MedicalCenter } from './../../entities/medical-center.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalCentersService } from './medical-center.service';
import { UsersModule } from '../users/users.module';
import { MedicalCentersController } from './medical-center.controller';
import { createSafeRepositoryProviders } from 'src/common/helpers/safe-repository.provider';

const MedicalCenterEntities = [MedicalCenter];

@Module({
  imports: [TypeOrmModule.forFeature(MedicalCenterEntities), UsersModule],
  providers: [
    MedicalCentersService,
    ...createSafeRepositoryProviders(MedicalCenterEntities),
  ],
  controllers: [MedicalCentersController],
  exports: [MedicalCentersService],
})
export class MedicalCentersModule {}
