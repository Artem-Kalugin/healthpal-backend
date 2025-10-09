import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { FileStorageService } from './file-storage.service';

type ImageType = 'avatar';
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
};

@Injectable()
export class ImageFileStorageService {
  constructor(private readonly fileService: FileStorageService) {}

  async processAndSave(
    avatar: Buffer<ArrayBufferLike>,
    type: ImageType,
  ): Promise<{ image: string; thumbhash: string }> {
    const preset = IMAGE_PROCESSING_PRESETS[type];
    let imagePath = '';

    try {
      const resized = await sharp(avatar)
        .resize(preset.resize.width, preset.resize.height, {
          fit: preset.resize.fit,
        })
        .jpeg({ quality: preset.quality })
        .toBuffer();

      const resizedForThumhash = await sharp(avatar)
        .resize(100, 100, {
          fit: preset.resize.fit,
        })
        .jpeg({ quality: preset.quality })
        .toBuffer();

      imagePath = this.fileService.saveFile(resized, 'jpg');

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
      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to process image: ${error.message}`,
      );
    }
  }

  deleteImage(imagePath: string): void {
    this.fileService.deleteFile(imagePath);
  }
}
