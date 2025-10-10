import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SafeRepository } from 'src/common/providers/safe-repository.providers';
import { OnboardingSlide } from 'src/entities/onboarding-slide.entity';
import { DataSource, FindManyOptions } from 'typeorm';
import { CreateOnboardingSlideDto } from 'src/domain/onboarding-slides/dto/create-onboarding-slide.dto';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';

@Injectable()
export class OnboardingSlidesService {
  constructor(
    @InjectRepository(OnboardingSlide)
    private readonly repo: SafeRepository<OnboardingSlide>,
    private readonly imageFileStorageService: ImageFileStorageService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateOnboardingSlideDto,
    imageBuffer?: Buffer<ArrayBufferLike>,
  ) {
    const count = await this.repo.count();
    if (count >= 10) {
      throw new BadRequestException('Max 10 slides allowed');
    }

    let savedImagePath: string | undefined;
    let processedImage: OnboardingSlide['image'] | undefined;

    return this.dataSource.transaction(async manager => {
      const slideRepo = manager.withRepository(this.repo);

      if (imageBuffer) {
        processedImage = await this.imageFileStorageService.processAndSave(
          imageBuffer,
          'onboarding',
          false,
        );
        savedImagePath = processedImage.image;
      }

      const slide = slideRepo.create({
        ...dto,
        image: processedImage,
      });

      try {
        return await slideRepo.safeSave(slide);
      } catch (error) {
        if (savedImagePath) {
          this.imageFileStorageService.deleteImage(savedImagePath);
        }
        throw error;
      }
    });
  }

  async findAll(
    sorted: boolean,
    activeOnly: boolean,
  ): Promise<OnboardingSlide[]> {
    const findOptions: FindManyOptions<OnboardingSlide> = {};

    if (sorted) findOptions.order = { order: 'ASC' };
    if (activeOnly) findOptions.where = { isActive: true };

    return this.repo.find(findOptions);
  }
}
