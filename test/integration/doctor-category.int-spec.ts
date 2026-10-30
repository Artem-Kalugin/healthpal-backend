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

  it('returns categories ordered by `order`, equal values by id', async () => {
    const dentistry = await factories.category({
      type: DoctorCategoryType.DENTISTRY,
      icon: 'tooth',
      order: 2,
    });
    const cardiology = await factories.category({
      type: DoctorCategoryType.CARDIOLOGY,
      icon: 'heart',
      order: 1,
    });
    const general = await factories.category({
      type: DoctorCategoryType.GENERAL,
      order: 1,
    });

    const result = await service.findAll();

    expect(result.map(item => item.id)).toEqual(
      [cardiology.id, general.id]
        .sort((a, b) => a.localeCompare(b))
        .concat(dentistry.id),
    );
    expect(result.find(item => item.id === cardiology.id)).toMatchObject({
      type: DoctorCategoryType.CARDIOLOGY,
      icon: 'heart',
    });
  });
});
