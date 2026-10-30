import { ErrorCode } from 'src/common/errors/error-code';
import sharp from 'sharp';
import type { FileStorageService } from './file-storage.service';
import { ImageFileStorageService } from './image-file-storage.service';

const SAVED_PATH = '/uploads/protected/file-1.webp';

describe('ImageFileStorageService', () => {
  let storage: { saveFile: jest.Mock; deleteFile: jest.Mock };
  let service: ImageFileStorageService;
  let source: Buffer;

  beforeAll(async () => {
    source = await sharp({
      create: {
        width: 2000,
        height: 1500,
        channels: 3,
        background: '#ff0000',
      },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(() => {
    storage = {
      saveFile: jest.fn().mockReturnValue(SAVED_PATH),
      deleteFile: jest.fn(),
    };
    service = new ImageFileStorageService(
      storage as unknown as FileStorageService,
    );
  });

  describe('processAndSave', () => {
    it('saves the image as webp at the preset size and returns the path', async () => {
      const result = await service.processAndSave(source, 'avatar');

      expect(result.image).toBe(SAVED_PATH);
      expect(storage.saveFile).toHaveBeenCalledTimes(1);
      const [saved, extension] = storage.saveFile.mock.calls[0] as [
        Buffer,
        string,
      ];
      expect(extension).toBe('webp');
      const meta = await sharp(saved).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 400, height: 400 });
    });

    it.each([
      ['avatar', 400],
      ['onboarding', 1024],
      ['medical-centers', 512],
      ['doctors', 512],
    ] as const)('preset %s gives a %i square', async (type, size) => {
      await service.processAndSave(source, type);

      const [saved] = storage.saveFile.mock.calls[0] as [Buffer];
      const meta = await sharp(saved).metadata();
      expect(meta).toMatchObject({ width: size, height: size });
    });

    it('passes isProtected to saveFile (true by default)', async () => {
      await service.processAndSave(source, 'avatar');
      await service.processAndSave(source, 'avatar', false);

      expect(storage.saveFile).toHaveBeenNthCalledWith(
        1,
        expect.any(Buffer),
        'webp',
        true,
      );
      expect(storage.saveFile).toHaveBeenNthCalledWith(
        2,
        expect.any(Buffer),
        'webp',
        false,
      );
    });

    it('broken buffer → BadRequest, nothing is saved', async () => {
      await expect(
        service.processAndSave(Buffer.from('not an image'), 'avatar'),
      ).rejects.toMatchObject({ code: ErrorCode.IMAGE_INVALID });

      expect(storage.saveFile).not.toHaveBeenCalled();
      expect(storage.deleteFile).not.toHaveBeenCalled();
    });
  });
});
