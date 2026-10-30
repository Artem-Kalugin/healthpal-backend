import { ErrorCode } from 'src/common/errors/error-code';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { userFavoriteDoctor } from 'src/db/schema';
import { DoctorFavoriteService } from 'src/domain/doctor/modules/doctor-favorite/doctor-favorite.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

describe('DoctorFavoriteService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: DoctorFavoriteService;
  let userId: string;
  let otherUserId: string;

  const links = () => db.select().from(userFavoriteDoctor);

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new DoctorFavoriteService(db);
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
    it('saves the link and returns the doctor id', async () => {
      const doctor = await factories.doctor();

      const result = await service.addToFavoritesForUser(userId, doctor.id);

      expect(result).toEqual({ success: true, doctorId: doctor.id });
      expect(await links()).toMatchObject([{ userId, doctorId: doctor.id }]);
    });

    it('nonexistent doctor: DOCTOR_NOT_FOUND, no link is created', async () => {
      await expect(
        service.addToFavoritesForUser(userId, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.DOCTOR_NOT_FOUND });
      expect(await links()).toHaveLength(0);
    });

    it('repeated add: FAVORITE_ALREADY_EXISTS, a single link remains', async () => {
      const doctor = await factories.doctor();
      await service.addToFavoritesForUser(userId, doctor.id);

      await expect(
        service.addToFavoritesForUser(userId, doctor.id),
      ).rejects.toMatchObject({ code: ErrorCode.FAVORITE_ALREADY_EXISTS });
      expect(await links()).toHaveLength(1);
    });

    it('the favorite of another user does not prevent adding the same doctor', async () => {
      const doctor = await factories.doctor();
      await service.addToFavoritesForUser(otherUserId, doctor.id);

      await expect(
        service.addToFavoritesForUser(userId, doctor.id),
      ).resolves.toMatchObject({ success: true });
      expect(await links()).toHaveLength(2);
    });
  });

  describe('removeFromFavoritesForUser', () => {
    it('removes only the link of this user to this doctor', async () => {
      const [target, kept] = [
        await factories.doctor(),
        await factories.doctor(),
      ];
      await service.addToFavoritesForUser(userId, target.id);
      await service.addToFavoritesForUser(userId, kept.id);
      await service.addToFavoritesForUser(otherUserId, target.id);

      await expect(
        service.removeFromFavoritesForUser(userId, target.id),
      ).resolves.toBeUndefined();

      const left = (await links()).map(l => [l.userId, l.doctorId]);
      expect(left).toHaveLength(2);
      expect(left).toEqual(
        expect.arrayContaining([
          [userId, kept.id],
          [otherUserId, target.id],
        ]),
      );
    });

    it('removing a missing link does not throw', async () => {
      await expect(
        service.removeFromFavoritesForUser(userId, MISSING_ID),
      ).resolves.toBeUndefined();
    });
  });
});
