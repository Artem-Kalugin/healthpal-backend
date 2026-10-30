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

  it('returns an empty list if there are no slides', async () => {
    await expect(service.findActive()).resolves.toEqual([]);
  });

  it('returns only active slides in ascending order', async () => {
    await slide('third', 3);
    await slide('hidden', 2, false);
    await slide('first', 1);
    await slide('second', 2);

    const result = await service.findActive();

    expect(result.map(item => item.title)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(result[0]).toMatchObject({ text: 'first text', image: IMAGE });
  });
});
