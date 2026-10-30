import { Constraint } from 'src/db/constraints';
import { Region } from 'src/db/enums';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import {
  doctorSchedule,
  medicalCenter,
  userFavoriteDoctor,
} from 'src/db/schema';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

/** Constraint violated by the query: the Postgres code and name are in the driver error `cause`. */
const violation = async (query: PromiseLike<unknown>) => {
  try {
    await query;
  } catch (error) {
    expect(error).toBeInstanceOf(DrizzleQueryError);

    return (error as DrizzleQueryError).cause as unknown as {
      code: string;
      constraint: string;
    };
  }

  throw new Error('The query did not violate a constraint');
};

describe('schema (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  it('defaults the medical center timezone to Europe/Moscow', async () => {
    const [{ id }] = await db
      .insert(medicalCenter)
      .values({
        name: { ru: 'Center', en: 'Center' },
        address: { ru: 'Address', en: 'Address' },
        city: { ru: 'Moscow', en: 'Moscow' },
        image: { image: 'a', thumbhash: 'b' },
        lat: 1,
        lon: 1,
      })
      .returning({ id: medicalCenter.id });

    const [center] = await db
      .select()
      .from(medicalCenter)
      .where(eq(medicalCenter.id, id));

    expect(center?.timezone).toBe('Europe/Moscow');
  });

  it('rejects a malformed phone and a future birthday', async () => {
    expect(await violation(factories.user({ phone: '12345' }))).toEqual(
      expect.objectContaining({
        code: '23514',
        constraint: Constraint.USER_PHONE_FORMAT_CHECK,
      }),
    );
    expect(
      await violation(factories.user({ birthday: new Date('2999-01-01') })),
    ).toEqual(
      expect.objectContaining({
        code: '23514',
        constraint: Constraint.USER_BIRTHDAY_PAST_CHECK,
      }),
    );
  });

  it('accepts an international E.164 phone', async () => {
    await expect(
      factories.user({ phone: '+4915112345678' }),
    ).resolves.toBeDefined();
  });

  it('defaults the medical center region to RU', async () => {
    const center = await factories.medicalCenter();

    expect(center.region).toBe(Region.RU);
  });

  it('rejects a weekday outside 1..7', async () => {
    const doctor = await factories.doctor();

    expect(
      await violation(
        db.insert(doctorSchedule).values({
          doctorId: doctor.id,
          weekday: 8 as never,
          startTime: '09:00:00',
          endTime: '13:00:00',
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        code: '23514',
        constraint: Constraint.DOCTOR_SCHEDULE_WEEKDAY_CHECK,
      }),
    );
  });

  it('rejects a favorite of an unknown doctor', async () => {
    const user = await factories.user();

    expect(
      await violation(
        db.insert(userFavoriteDoctor).values({
          userId: user.id,
          doctorId: '00000000-0000-4000-8000-000000000000',
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        code: '23503',
        constraint: Constraint.USER_FAVORITE_DOCTOR_DOCTOR_FK,
      }),
    );
  });
});
