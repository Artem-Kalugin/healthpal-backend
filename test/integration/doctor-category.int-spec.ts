import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { DoctorCategoryType } from 'src/db/enums';
import { DoctorCategoryService } from 'src/domain/doctor/modules/doctor-category/doctor-category.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

describe('DoctorCategoryService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let service: DoctorCategoryService;
  let factories: ReturnType<typeof createFactories>;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    service = new DoctorCategoryService(db);
    factories = createFactories(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  it('returns an empty list if there are no categories', async () => {
    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('returns all categories with type, icon and id', async () => {
    const cardiology = await factories.category({
      type: DoctorCategoryType.CARDIOLOGY,
      icon: 'heart',
    });
    const dentistry = await factories.category({
      type: DoctorCategoryType.DENTISTRY,
      icon: 'tooth',
    });

    const result = await service.findAll();

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: cardiology.id,
          type: 'cardiology',
          icon: 'heart',
          order: 0,
        }),
        expect.objectContaining({
          id: dentistry.id,
          type: 'dentistry',
          icon: 'tooth',
          order: 0,
        }),
      ]),
    );
  });
});
