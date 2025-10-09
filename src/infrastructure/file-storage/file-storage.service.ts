import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileStorageService {
  private readonly uploadsDir = path.join(__dirname, '..', '..', 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  saveFile(buffer: Buffer, extension: string): string {
    const filename = `file-${uuidv4()}.${extension}`;
    const filepath = path.join(this.uploadsDir, filename);

    try {
      fs.writeFileSync(filepath, buffer);
      return `/uploads/${filename}`;
    } catch (error) {
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to save file: ${'message' in error ? typeof error.message === 'string' : undefined}`,
      );
    }
  }

  deleteFile(filePath: string): void {
    const filepath = path.join(this.uploadsDir, path.basename(filePath));

    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (error) {
        throw new InternalServerErrorException(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to delete file: ${error.message}`,
        );
      }
    }
  }

  getUploadsDir(): string {
    return this.uploadsDir;
  }
}
