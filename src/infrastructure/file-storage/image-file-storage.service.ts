import { Injectable, ParseFilePipeBuilder } from '@nestjs/common';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { FileStorageService } from './file-storage.service';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

type ImageType = 'avatar' | 'onboarding' | 'medical-centers' | 'doctors';
interface ImageProcessingOptions {
  resize: {
    width: number;
    height: number;
    fit: sharp.FitEnum[keyof sharp.FitEnum];
  };
  quality: number;
}

const IMAGE_PROCESSING_PRESETS: Record<ImageType, ImageProcessingOptions> = {
  avatar: {
    resize: { width: 400, height: 400, fit: 'cover' },
    quality: 75,
  },
  onboarding: {
    resize: { width: 1024, height: 1024, fit: 'cover' },
    quality: 95,
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'medical-centers': {
    resize: { width: 512, height: 512, fit: 'cover' },
    quality: 90,
  },
  doctors: {
    resize: { width: 512, height: 512, fit: 'cover' },
    quality: 90,
  },
};

export const avatarValidator = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: /^(image\/jpeg|image\/png|image\/webp)$/,
  })
  .addMaxSizeValidator({
    maxSize: 10 * 1024 * 1024,
  })
  .build({
    fileIsRequired: false,
  });

@Injectable()
export class ImageFileStorageService {
  constructor(private readonly fileService: FileStorageService) {}

  async processAndSave(
    avatar: Buffer<ArrayBufferLike>,
    type: ImageType,
    isProtected: boolean = true,
  ): Promise<{ image: string; thumbhash: string }> {
    const preset = IMAGE_PROCESSING_PRESETS[type];
    let imagePath = '';

    try {
      const resized = await sharp(avatar)
        .resize(preset.resize.width, preset.resize.height, {
          fit: preset.resize.fit,
        })
        .webp({ quality: preset.quality })
        .toBuffer();

      const resizedForThumhash = await sharp(avatar)
        .resize(100, 100, {
          fit: preset.resize.fit,
        })
        .jpeg({ quality: preset.quality })
        .toBuffer();

      imagePath = this.fileService.saveFile(resized, 'webp', isProtected);

      const { data, info } = await sharp(resizedForThumhash)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
      const thumbhash = rgbaToThumbHash(info.width, info.height, data);

      return {
        image: imagePath,
        thumbhash: Buffer.from(thumbhash).toString('base64'),
      };
    } catch (error) {
      if (imagePath) {
        this.fileService.deleteFile(imagePath);
      }

      throw new AppException(ErrorCode.IMAGE_INVALID, {
        message: `Failed to process image: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });
    }
  }

  deleteImage(imagePath: string): void {
    this.fileService.deleteFile(imagePath);
  }
}
