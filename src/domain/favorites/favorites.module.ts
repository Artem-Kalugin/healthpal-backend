import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createSafeRepositoryProviders } from 'src/common/helpers/safe-repository.provider';
import { UserFavoriteDoctor } from 'src/entities/user-favorite-doctor.relation';
import { FavoritesService } from './favorites.service';
import { DoctorModule } from '../doctor/doctor.module';
import { MedicalCentersModule } from '../medical-center/medical-center.module';
import { UserFavoriteMedicalCenter } from 'src/entities/user-favorite-medical-center.relation';

const UserModuleEntities = [UserFavoriteDoctor, UserFavoriteMedicalCenter];

@Module({
  imports: [
    TypeOrmModule.forFeature(UserModuleEntities),
    DoctorModule,
    MedicalCentersModule,
  ],
  providers: [
    FavoritesService,
    ...createSafeRepositoryProviders(UserModuleEntities),
  ],
  controllers: [FavoritesController],
  exports: [FavoritesService],
})
export class FavoritesModule {}
