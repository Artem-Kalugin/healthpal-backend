import { DataSource, QueryFailedError } from 'typeorm';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { clearDatabase, createTestDataSource } from './db';
import { createFactories } from './factories';

describe('schema (integration)', () => {
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factories = createFactories(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  it('defaults the medical center timezone to Europe/Moscow', async () => {
    const { id } = await dataSource.getRepository(MedicalCenter).save({
      name: 'Center',
      address: 'Address',
      city: 'Москва',
      image: { image: 'a', thumbhash: 'b' },
      lat: 1,
      lon: 1,
    });

    const center = await dataSource
      .getRepository(MedicalCenter)
      .findOneByOrFail({ id });

    expect(center.timezone).toBe('Europe/Moscow');
  });

  // На этом держится защита от двойной записи на слот (I3).
  it('rejects a second appointment on the same time slot at the database level', async () => {
    const doctor = await factories.doctor();
    const slot = await factories.timeSlot(doctor.id);
    const first = await factories.user();
    const second = await factories.user();

    await factories.appointment(first.id, slot);

    await expect(factories.appointment(second.id, slot)).rejects.toThrow(
      QueryFailedError,
    );
  });
});
