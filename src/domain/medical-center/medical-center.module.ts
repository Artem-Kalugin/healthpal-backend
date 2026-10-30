import { Module } from '@nestjs/common';
import { MedicalCentersService } from './medical-center.service';
import { UsersModule } from 'src/domain/users/users.module';
import { MedicalCentersController } from './medical-center.controller';

@Module({
  imports: [UsersModule],
  providers: [MedicalCentersService],
  controllers: [MedicalCentersController],
  exports: [MedicalCentersService],
})
export class MedicalCentersModule {}
