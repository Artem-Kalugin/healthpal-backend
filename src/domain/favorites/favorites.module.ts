import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { DoctorModule } from '../doctor/doctor.module';
import { MedicalCentersModule } from '../medical-center/medical-center.module';

@Module({
  imports: [DoctorModule, MedicalCentersModule],
  providers: [FavoritesService],
  controllers: [FavoritesController],
  exports: [FavoritesService],
})
export class FavoritesModule {}
