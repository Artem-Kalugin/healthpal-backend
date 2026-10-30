import { ErrorCode } from 'src/common/errors/error-code';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { FileStorageService } from 'src/infrastructure/file-storage/file-storage.service';
import { ImageFileStorageService } from 'src/infrastructure/file-storage/image-file-storage.service';

jest.mock('thumbhash', () => ({
  rgbaToThumbHash: jest.fn(() => new Uint8Array()),
}));

describe('ImageFileStorageService (integration)', () => {
  let baseDirectory: string;
  let service: ImageFileStorageService;
  let source: Buffer;

  const filesIn = (kind: 'public' | 'protected') =>
    fs.readdirSync(path.join(baseDirectory, kind));

  beforeAll(async () => {
    source = await sharp({
      create: { width: 600, height: 400, channels: 3, background: '#00ff00' },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(() => {
    baseDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'healthpal-uploads-'),
    );
    service = new ImageFileStorageService(
      new FileStorageService(baseDirectory),
    );
  });

  afterEach(() => {
    fs.rmSync(baseDirectory, { recursive: true, force: true });
  });

  it.each([
    ['protected', true],
    ['public', false],
  ] as const)(
    'deleteImage removes the file at the path returned by processAndSave (%s)',
    async (kind, isProtected) => {
      const { image } = await service.processAndSave(
        source,
        'avatar',
        isProtected,
      );
      expect(filesIn(kind)).toHaveLength(1);

      service.deleteImage(image);

      expect(filesIn(kind)).toHaveLength(0);
    },
  );

  it('error after saving → IMAGE_INVALID and the file is rolled back', async () => {
    jest.mocked(rgbaToThumbHash).mockImplementationOnce(() => {
      throw new Error('thumbhash failed');
    });

    await expect(
      service.processAndSave(source, 'avatar'),
    ).rejects.toMatchObject({ code: ErrorCode.IMAGE_INVALID });

    expect(filesIn('protected')).toHaveLength(0);
  });
});
