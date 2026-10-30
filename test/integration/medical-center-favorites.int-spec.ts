import { ErrorCode } from 'src/common/errors/error-code';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { userFavoriteMedicalCenter } from 'src/db/schema';
import { MedicalCenterService } from 'src/domain/medical-center/medical-center.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

describe('MedicalCenterService favorites (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: MedicalCenterService;
  let userId: string;
  let otherUserId: string;

  const links = () => db.select().from(userFavoriteMedicalCenter);

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new MedicalCenterService(db);
  });

  beforeEach(async () => {
    await clearDatabase(db);
    userId = (await factories.user()).id;
    otherUserId = (await factories.user()).id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addToFavoritesForUser', () => {
    it('saves the link and returns the center id', async () => {
      const center = await factories.medicalCenter();

      const result = await service.addToFavoritesForUser(userId, center.id);

      expect(result).toEqual({ success: true, medicalCenterId: center.id });
      expect(await links()).toMatchObject([
        { userId, medicalCenterId: center.id },
      ]);
    });

    it('nonexistent center: MEDICAL_CENTER_NOT_FOUND, no link is created', async () => {
      await expect(
        service.addToFavoritesForUser(userId, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.MEDICAL_CENTER_NOT_FOUND });
      expect(await links()).toHaveLength(0);
    });

    it('repeated add: FAVORITE_ALREADY_EXISTS, a single link remains', async () => {
      const center = await factories.medicalCenter();
      await service.addToFavoritesForUser(userId, center.id);

      await expect(
        service.addToFavoritesForUser(userId, center.id),
      ).rejects.toMatchObject({ code: ErrorCode.FAVORITE_ALREADY_EXISTS });
      expect(await links()).toHaveLength(1);
    });
  });

  describe('removeFromFavoritesForUser', () => {
    it('removes only the link of this user to this center', async () => {
      const [target, kept] = [
        await factories.medicalCenter(),
        await factories.medicalCenter(),
      ];
      await service.addToFavoritesForUser(userId, target.id);
      await service.addToFavoritesForUser(userId, kept.id);
      await service.addToFavoritesForUser(otherUserId, target.id);

      await expect(
        service.removeFromFavoritesForUser(userId, target.id),
      ).resolves.toBeUndefined();

      const left = (await links()).map(l => [l.userId, l.medicalCenterId]);
      expect(left).toHaveLength(2);
      expect(left).toEqual(
        expect.arrayContaining([
          [userId, kept.id],
          [otherUserId, target.id],
        ]),
      );
    });
  });
});
