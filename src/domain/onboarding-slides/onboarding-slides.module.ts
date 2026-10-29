import { Module } from '@nestjs/common';
import { OnboardingSlidesService } from './onboarding-slides.service';
import { OnboardingSlidesController } from './onboarding-slides.controller';

@Module({
  providers: [OnboardingSlidesService],
  controllers: [OnboardingSlidesController],
  exports: [OnboardingSlidesService],
})
export class OnboardingSlidesModule {}
