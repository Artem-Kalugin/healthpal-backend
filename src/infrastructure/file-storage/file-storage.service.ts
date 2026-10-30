import { Inject, Injectable, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

export const FILE_STORAGE_BASE_DIR = 'FILE_STORAGE_BASE_DIR';

const STORED_PATH_PATTERN = /^\/uploads\/(public|protected)\//;

@Injectable()
export class FileStorageService {
  private readonly baseDirectory: string;
  private readonly publicDir: string;
  private readonly protectedDir: string;

  constructor(
    @Optional() @Inject(FILE_STORAGE_BASE_DIR) baseDirectory?: string,
  ) {
    this.baseDirectory =
      baseDirectory ?? path.join(__dirname, '..', '..', '..', 'uploads');
    this.publicDir = path.join(this.baseDirectory, 'public');
    this.protectedDir = path.join(this.baseDirectory, 'protected');

    [this.baseDirectory, this.publicDir, this.protectedDir].forEach(
      directory => {
        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true });
        }
      },
    );
  }

  saveFile(buffer: Buffer, extension: string, isProtected = true): string {
    const filename = `file-${randomUUID()}.${extension}`;
    const targetDirectory = isProtected ? this.protectedDir : this.publicDir;
    const filepath = path.join(targetDirectory, filename);

    try {
      fs.writeFileSync(filepath, buffer);
      return `/uploads/${isProtected ? 'protected' : 'public'}/${filename}`;
    } catch (error) {
      throw new AppException(ErrorCode.FILE_SAVE_FAILED, {
        clientCode: ErrorCode.INTERNAL_ERROR,
        message: `Failed to save file at ${filepath}`,
        cause: error,
      });
    }
  }

  // Принимает как имя файла, так и путь, который возвращает saveFile
  // (`/uploads/<protected|public>/<name>`): в БД хранится именно путь.
  deleteFile(fileNameOrPath: string, isProtected = true): void {
    const storedPath = STORED_PATH_PATTERN.exec(fileNameOrPath);
    const isInProtected = storedPath
      ? storedPath[1] === 'protected'
      : isProtected;
    const targetDirectory = isInProtected ? this.protectedDir : this.publicDir;
    const filepath = path.join(targetDirectory, path.basename(fileNameOrPath));

    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (error) {
        throw new AppException(ErrorCode.FILE_DELETE_FAILED, {
          clientCode: ErrorCode.INTERNAL_ERROR,
          message: `Failed to delete file at ${filepath}`,
          cause: error,
        });
      }
    }
  }

  getFilePath(fileName: string, isProtected = true): string {
    const targetDirectory = isProtected ? this.protectedDir : this.publicDir;
    return path.join(targetDirectory, path.basename(fileName));
  }

  getPublicDir(): string {
    return this.publicDir;
  }

  getProtectedDir(): string {
    return this.protectedDir;
  }
}
