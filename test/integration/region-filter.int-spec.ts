import type { Pool } from 'pg';
import { Locale } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import type { Database } from 'src/db/db.module';
import { Region } from 'src/db/enums';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { DoctorFavoriteService } from 'src/domain/doctor/modules/doctor-favorite/doctor-favorite.service';
import { MedicalCenterService } from 'src/domain/medical-center/medical-center.service';
import { MedicalCenterFavoriteService } from 'src/domain/medical-center/modules/medical-center-favorite/medical-center-favorite.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const RU: RequestContext = { locale: Locale.RU, region: Region.RU };
const EU: RequestContext = { locale: Locale.RU, region: Region.EU };
const PAGE = { page: 1, size: 10 };

describe('catalog region filter (integration)', () => {
  let db: Database;
  let pool: Pool;
  let doctors: DoctorService;
  let centers: MedicalCenterService;
  let doctorFavorites: DoctorFavoriteService;
  let centerFavorites: MedicalCenterFavoriteService;
  let userId: string;
  let ruCenterId: string;
  let euCenterId: string;
  let ruDoctorId: string;
  let euDoctorId: string;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    const factories = createFactories(db);
    doctors = new DoctorService(db);
    centers = new MedicalCenterService(db);
    doctorFavorites = new DoctorFavoriteService(db, doctors);
    centerFavorites = new MedicalCenterFavoriteService(db, centers);

    ruCenterId = (await factories.medicalCenter({ region: Region.RU })).id;
    euCenterId = (await factories.medicalCenter({ region: Region.EU })).id;
    ruDoctorId = (await factories.doctor({ medicalCenterId: ruCenterId })).id;
    euDoctorId = (await factories.doctor({ medicalCenterId: euCenterId })).id;
    userId = (await factories.user()).id;
  });

  afterAll(async () => {
    await clearDatabase(db);
    await pool.end();
  });

  const searchIds = async (context: RequestContext) =>
    (await doctors.searchForUser(userId, PAGE, context)).data.map(
      item => item.id,
    );

  it('doctor search returns only the doctors of the request region', async () => {
    await expect(searchIds(RU)).resolves.toEqual([ruDoctorId]);
    await expect(searchIds(EU)).resolves.toEqual([euDoctorId]);
  });

  it('center list returns only the centers of the request region', async () => {
    const ids = async (context: RequestContext, query = {}) =>
      (await centers.findForUser(userId, query as never, context)).map(
        center => center.id,
      );

    await expect(ids(RU)).resolves.toEqual([ruCenterId]);
    await expect(ids(EU)).resolves.toEqual([euCenterId]);
    await expect(ids(EU, { lat: '52.5', lon: '13.4' })).resolves.toEqual([
      euCenterId,
    ]);
  });

  it('a doctor is returned by id regardless of the region', async () => {
    await expect(
      doctors.findOneForUser(userId, euDoctorId, RU),
    ).resolves.toMatchObject({ id: euDoctorId });
  });

  it('favorites of another region are hidden and come back with the region', async () => {
    await doctorFavorites.addToFavoritesForUser(userId, ruDoctorId);
    await doctorFavorites.addToFavoritesForUser(userId, euDoctorId);
    await centerFavorites.addToFavoritesForUser(userId, ruCenterId);
    await centerFavorites.addToFavoritesForUser(userId, euCenterId);

    const doctorIds = async (context: RequestContext) =>
      (
        await doctorFavorites.findFavoritesForUser(userId, PAGE, context)
      ).data.map(item => item.id);
    const centerIds = async (context: RequestContext) =>
      (
        await centerFavorites.findFavoritesForUser(userId, PAGE, context)
      ).data.map(item => item.id);

    await expect(doctorIds(EU)).resolves.toEqual([euDoctorId]);
    await expect(doctorIds(RU)).resolves.toEqual([ruDoctorId]);
    await expect(centerIds(EU)).resolves.toEqual([euCenterId]);
    await expect(centerIds(RU)).resolves.toEqual([ruCenterId]);
  });
});
