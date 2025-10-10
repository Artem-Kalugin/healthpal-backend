import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { ImageFileStorageService } from './image-file-storage.service';
import { AssetsController } from './assets.controller';

@Module({
  providers: [FileStorageService, ImageFileStorageService],
  exports: [FileStorageService, ImageFileStorageService],
  controllers: [AssetsController],
})
export class FileStorageModule {}
