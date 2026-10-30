import { ErrorCode } from 'src/common/errors/error-code';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { userFavoriteDoctor, userFavoriteMedicalCenter } from 'src/db/schema';
import { FavoritesService } from 'src/domain/favorites/favorites.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

describe('FavoritesService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: FavoritesService;
  let userId: string;
  let otherUserId: string;

  const doctorLinks = () => db.select().from(userFavoriteDoctor);
  const centerLinks = () => db.select().from(userFavoriteMedicalCenter);

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new FavoritesService(db);
  });

  beforeEach(async () => {
    await clearDatabase(db);
    userId = (await factories.user()).id;
    otherUserId = (await factories.user()).id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('addDoctorToFavorites', () => {
    it('saves the link and returns the doctor id', async () => {
      const doctor = await factories.doctor();

      const result = await service.addDoctorToFavorites(userId, doctor.id);

      expect(result).toEqual({ success: true, doctorId: doctor.id });
      expect(await doctorLinks()).toMatchObject([
        { userId, doctorId: doctor.id },
      ]);
    });

    it('nonexistent doctor: DOCTOR_NOT_FOUND, no link is created', async () => {
      await expect(
        service.addDoctorToFavorites(userId, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.DOCTOR_NOT_FOUND });
      expect(await doctorLinks()).toHaveLength(0);
    });

    it('repeated add: FAVORITE_ALREADY_EXISTS, a single link remains', async () => {
      const doctor = await factories.doctor();
      await service.addDoctorToFavorites(userId, doctor.id);

      await expect(
        service.addDoctorToFavorites(userId, doctor.id),
      ).rejects.toMatchObject({ code: ErrorCode.FAVORITE_ALREADY_EXISTS });
      expect(await doctorLinks()).toHaveLength(1);
    });

    it('the favorite of another user does not prevent adding the same doctor', async () => {
      const doctor = await factories.doctor();
      await service.addDoctorToFavorites(otherUserId, doctor.id);

      await expect(
        service.addDoctorToFavorites(userId, doctor.id),
      ).resolves.toMatchObject({ success: true });
      expect(await doctorLinks()).toHaveLength(2);
    });
  });

  describe('addMedicalCenterToFavorites', () => {
    it('saves the link and returns the center id', async () => {
      const center = await factories.medicalCenter();

      const result = await service.addMedicalCenterToFavorites(
        userId,
        center.id,
      );

      expect(result).toEqual({ success: true, medicalCenterId: center.id });
      expect(await centerLinks()).toMatchObject([
        { userId, medicalCenterId: center.id },
      ]);
    });

    it('nonexistent center: MEDICAL_CENTER_NOT_FOUND, no link is created', async () => {
      await expect(
        service.addMedicalCenterToFavorites(userId, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.MEDICAL_CENTER_NOT_FOUND });
      expect(await centerLinks()).toHaveLength(0);
    });

    it('repeated add: FAVORITE_ALREADY_EXISTS, a single link remains', async () => {
      const center = await factories.medicalCenter();
      await service.addMedicalCenterToFavorites(userId, center.id);

      await expect(
        service.addMedicalCenterToFavorites(userId, center.id),
      ).rejects.toMatchObject({ code: ErrorCode.FAVORITE_ALREADY_EXISTS });
      expect(await centerLinks()).toHaveLength(1);
    });
  });

  describe('removeDoctorFromFavorites', () => {
    it('removes only the link of this user to this doctor', async () => {
      const [target, kept] = [
        await factories.doctor(),
        await factories.doctor(),
      ];
      await service.addDoctorToFavorites(userId, target.id);
      await service.addDoctorToFavorites(userId, kept.id);
      await service.addDoctorToFavorites(otherUserId, target.id);

      await expect(
        service.removeDoctorFromFavorites(userId, target.id),
      ).resolves.toBeUndefined();

      const left = (await doctorLinks()).map(l => [l.userId, l.doctorId]);
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
        service.removeDoctorFromFavorites(userId, MISSING_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('removeMedicalCenterFromFavorites', () => {
    it('removes only the link of this user to this center', async () => {
      const [target, kept] = [
        await factories.medicalCenter(),
        await factories.medicalCenter(),
      ];
      await service.addMedicalCenterToFavorites(userId, target.id);
      await service.addMedicalCenterToFavorites(userId, kept.id);
      await service.addMedicalCenterToFavorites(otherUserId, target.id);

      await expect(
        service.removeMedicalCenterFromFavorites(userId, target.id),
      ).resolves.toBeUndefined();

      const left = (await centerLinks()).map(l => [
        l.userId,
        l.medicalCenterId,
      ]);
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
