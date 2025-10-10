import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileStorageService {
  private readonly baseDir = path.join(__dirname, '..', '..', '..', 'Uploads');
  private readonly publicDir = path.join(this.baseDir, 'public');
  private readonly protectedDir = path.join(this.baseDir, 'protected');

  constructor() {
    [this.baseDir, this.publicDir, this.protectedDir].forEach(directory => {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    });
  }

  saveFile(buffer: Buffer, extension: string, isProtected = true): string {
    const filename = `file-${uuidv4()}.${extension}`;
    const targetDirectory = isProtected ? this.protectedDir : this.publicDir;
    const filepath = path.join(targetDirectory, filename);

    try {
      fs.writeFileSync(filepath, buffer);
      return `/uploads/${isProtected ? 'protected' : 'public'}/${filename}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to save file: ${
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          'message' in error && typeof error.message === 'string'
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              error.message
            : 'unknown error'
        } at ${filepath}`,
      );
    }
  }

  deleteFile(fileName: string, isProtected = true): void {
    const targetDirectory = isProtected ? this.protectedDir : this.publicDir;
    const filepath = path.join(targetDirectory, fileName);

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

  getFilePath(fileName: string, isProtected = true): string {
    const targetDirectory = isProtected ? this.protectedDir : this.publicDir;
    const filepath = path.join(targetDirectory, fileName);
    return filepath.toLocaleLowerCase();
  }

  getPublicDir(): string {
    return this.publicDir;
  }

  getProtectedDir(): string {
    return this.protectedDir;
  }
}
