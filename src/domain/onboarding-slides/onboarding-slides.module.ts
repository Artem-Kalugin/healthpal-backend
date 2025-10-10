import { Module } from '@nestjs/common';
import { OnboardingSlidesService } from './onboarding-slides.service';
import { OnboardingSlide } from 'src/entities/onboarding-slide.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileStorageModule } from 'src/infrastructure/file-storage/file-storage.module';
import { createSafeRepositoryProviders } from 'src/common/providers/safe-repository.providers';
import { OnboardingSlidesController } from './onboarding-slides.controller';

const OnboardingModuleEntities = [OnboardingSlide];

@Module({
  imports: [
    TypeOrmModule.forFeature(OnboardingModuleEntities),
    FileStorageModule,
  ],
  providers: [
    OnboardingSlidesService,
    ...createSafeRepositoryProviders(OnboardingModuleEntities),
  ],
  controllers: [OnboardingSlidesController],
  exports: [OnboardingSlidesService],
})
export class OnboardingSlidesModule {}
