import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { ImageFileStorageService } from './image-file-storage.service';

@Module({
  providers: [FileStorageService, ImageFileStorageService],
  exports: [FileStorageService, ImageFileStorageService],
})
export class FileStorageModule {}
