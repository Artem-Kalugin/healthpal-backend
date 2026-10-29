import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { onboardingSlide } from 'src/db/schema';
import { OnboardingSlidesService } from 'src/domain/onboarding-slides/onboarding-slides.service';
import { clearDatabase, createTestDb } from './db';

const IMAGE = { image: 'image.jpg', thumbhash: 'thumbhash' };

describe('OnboardingSlidesService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let service: OnboardingSlidesService;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    service = new OnboardingSlidesService(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  const slide = (title: string, order: number, isActive = true) =>
    db
      .insert(onboardingSlide)
      .values({ title, text: `${title} text`, image: IMAGE, order, isActive });

  it('отдаёт пустой список, если слайдов нет', async () => {
    await expect(service.findActive()).resolves.toEqual([]);
  });

  it('отдаёт только активные слайды по возрастанию order', async () => {
    await slide('третий', 3);
    await slide('скрытый', 2, false);
    await slide('первый', 1);
    await slide('второй', 2);

    const result = await service.findActive();

    expect(result.map(item => item.title)).toEqual([
      'первый',
      'второй',
      'третий',
    ]);
    expect(result[0]).toMatchObject({ text: 'первый text', image: IMAGE });
  });
});
