import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { OnboardingSlide } from 'src/entities/onboarding-slide.entity';
import { FindManyOptions } from 'typeorm';
import { CreateOnboardingSlideDto } from 'src/domain/onboarding-slides/dto/create-onboarding-slide.dto';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';
@Injectable()
export class OnboardingSlidesService {
  constructor(
    @InjectRepository(OnboardingSlide)
    private readonly repo: SafeRepository<OnboardingSlide>,
    private readonly imageFileStorageService: ImageFileStorageService,
  ) {}

  async create(
    dto: CreateOnboardingSlideDto,
    imageBuffer?: Buffer<ArrayBufferLike>,
  ) {
    const count = await this.repo.count();
    if (count >= 10) {
      throw new BadRequestException('Max 10 slides allowed');
    }

    const processedImage = imageBuffer
      ? await this.imageFileStorageService.processAndSave(
          imageBuffer,
          'onboarding',
          false,
        )
      : undefined;

    try {
      return await this.repo.safeSave(
        this.repo.create({ ...dto, image: processedImage }),
      );
    } catch (error) {
      if (processedImage) {
        this.imageFileStorageService.deleteImage(processedImage.image);
      }
      throw error;
    }
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
