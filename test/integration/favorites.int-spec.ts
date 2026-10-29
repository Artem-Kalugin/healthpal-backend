import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createSafeRepository } from 'src/common/helpers/safe-repository.provider';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { FavoritesService } from 'src/domain/favorites/favorites.service';
import { MedicalCentersService } from 'src/domain/medical-center/medical-center.service';
import { Doctor } from 'src/entities/doctor.entity';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { UserFavoriteDoctor } from 'src/entities/user-favorite-doctor.relation';
import { UserFavoriteMedicalCenter } from 'src/entities/user-favorite-medical-center.relation';
import { clearDatabase, createTestDataSource } from './db';
import { createFactories } from './factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

describe('FavoritesService (integration)', () => {
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let service: FavoritesService;
  let userId: string;
  let otherUserId: string;

  const doctorLinks = () => dataSource.getRepository(UserFavoriteDoctor).find();
  const centerLinks = () =>
    dataSource.getRepository(UserFavoriteMedicalCenter).find();

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factories = createFactories(dataSource);
    service = new FavoritesService(
      createSafeRepository(dataSource.getRepository(UserFavoriteDoctor)),
      createSafeRepository(dataSource.getRepository(UserFavoriteMedicalCenter)),
      new DoctorService(createSafeRepository(dataSource.getRepository(Doctor))),
      new MedicalCentersService(
        createSafeRepository(dataSource.getRepository(MedicalCenter)),
      ),
    );
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    userId = (await factories.user()).id;
    otherUserId = (await factories.user()).id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('addDoctorToFavorites', () => {
    it('сохраняет связь и возвращает идентификатор врача', async () => {
      const doctor = await factories.doctor();

      const result = await service.addDoctorToFavorites(userId, doctor.id);

      expect(result).toEqual({ success: true, doctorId: doctor.id });
      expect(await doctorLinks()).toMatchObject([
        { userId, doctorId: doctor.id },
      ]);
    });

    it('несуществующий врач: NotFound, связь не создаётся', async () => {
      await expect(
        service.addDoctorToFavorites(userId, MISSING_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(await doctorLinks()).toHaveLength(0);
    });

    it('повторное добавление: Conflict, связь остаётся одна', async () => {
      const doctor = await factories.doctor();
      await service.addDoctorToFavorites(userId, doctor.id);

      await expect(
        service.addDoctorToFavorites(userId, doctor.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(await doctorLinks()).toHaveLength(1);
    });

    it('избранное другого пользователя не мешает добавить того же врача', async () => {
      const doctor = await factories.doctor();
      await service.addDoctorToFavorites(otherUserId, doctor.id);

      await expect(
        service.addDoctorToFavorites(userId, doctor.id),
      ).resolves.toMatchObject({ success: true });
      expect(await doctorLinks()).toHaveLength(2);
    });
  });

  describe('addMedicalCenterToFavorites', () => {
    it('сохраняет связь и возвращает идентификатор центра', async () => {
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

    it('несуществующий центр: NotFound, связь не создаётся', async () => {
      await expect(
        service.addMedicalCenterToFavorites(userId, MISSING_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(await centerLinks()).toHaveLength(0);
    });

    it('повторное добавление: Conflict, связь остаётся одна', async () => {
      const center = await factories.medicalCenter();
      await service.addMedicalCenterToFavorites(userId, center.id);

      await expect(
        service.addMedicalCenterToFavorites(userId, center.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(await centerLinks()).toHaveLength(1);
    });
  });

  describe('removeDoctorFromFavorites', () => {
    it('удаляет только связь этого пользователя с этим врачом', async () => {
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

    it('удаление отсутствующей связи не бросает исключение', async () => {
      await expect(
        service.removeDoctorFromFavorites(userId, MISSING_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('removeMedicalCenterFromFavorites', () => {
    it('удаляет только связь этого пользователя с этим центром', async () => {
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
