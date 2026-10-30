import { Module } from '@nestjs/common';
import { MedicalCenterService } from './medical-center.service';
import { UsersModule } from 'src/domain/users/users.module';
import { MedicalCenterController } from './medical-center.controller';

@Module({
  imports: [UsersModule],
  providers: [MedicalCenterService],
  controllers: [MedicalCenterController],
  exports: [MedicalCenterService],
})
export class MedicalCenterModule {}
