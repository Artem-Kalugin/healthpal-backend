import { Module } from '@nestjs/common';
import { MedicalCenterService } from './medical-center.service';
import { MedicalCenterController } from './medical-center.controller';
import { MedicalCenterFavoriteService } from './modules/medical-center-favorite/medical-center-favorite.service';
import { MedicalCenterFavoriteController } from './modules/medical-center-favorite/medical-center-favorite.controller';

@Module({
  providers: [MedicalCenterService, MedicalCenterFavoriteService],
  controllers: [MedicalCenterFavoriteController, MedicalCenterController],
  exports: [MedicalCenterService],
})
export class MedicalCenterModule {}
