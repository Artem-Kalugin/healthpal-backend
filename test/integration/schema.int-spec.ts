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

/** Ограничение, нарушенное запросом: код Postgres и имя лежат в `cause` ошибки драйвера. */
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

  throw new Error('Запрос не нарушил ограничение');
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
        name: 'Center',
        address: 'Address',
        city: 'Москва',
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

  // На этом держится защита от двойной записи на слот (I3).
  it('rejects a second appointment on the same time slot at the database level', async () => {
    const doctor = await factories.doctor();
    const slot = await factories.timeSlot(doctor.id);
    const first = await factories.user();
    const second = await factories.user();

    await factories.appointment(first.id, slot);

    expect(await violation(factories.appointment(second.id, slot))).toEqual(
      expect.objectContaining({
        code: '23505',
        constraint: 'appointment_time_slot_unique',
      }),
    );
  });

  it('rejects a duplicate phone', async () => {
    const existing = await factories.user();

    expect(await violation(factories.user({ phone: existing.phone }))).toEqual(
      expect.objectContaining({
        code: '23505',
        constraint: 'user_phone_unique',
      }),
    );
  });

  it('rejects a malformed phone and a future birthday', async () => {
    expect(await violation(factories.user({ phone: '12345' }))).toEqual(
      expect.objectContaining({
        code: '23514',
        constraint: 'user_phone_format_check',
      }),
    );
    expect(
      await violation(factories.user({ birthday: new Date('2999-01-01') })),
    ).toEqual(
      expect.objectContaining({
        code: '23514',
        constraint: 'user_birthday_past_check',
      }),
    );
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
        constraint: 'doctor_schedule_weekday_check',
      }),
    );
  });

  it('rejects a duplicate favorite and an unknown doctor', async () => {
    const user = await factories.user();
    const doctor = await factories.doctor();
    const favorite = { userId: user.id, doctorId: doctor.id };

    await db.insert(userFavoriteDoctor).values(favorite);

    expect(
      await violation(db.insert(userFavoriteDoctor).values(favorite)),
    ).toEqual(
      expect.objectContaining({
        code: '23505',
        constraint: 'user_favorite_doctor_pk',
      }),
    );
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
        constraint: 'user_favorite_doctor_doctor_fk',
      }),
    );
  });
});
