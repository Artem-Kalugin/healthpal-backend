import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import { ScheduleDay } from 'src/db/enums';
import { DoctorService } from 'src/domain/doctor/doctor.service';
import { DoctorScheduleService } from 'src/domain/doctor/modules/doctor-schedule/doctor-schedule.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

const emptyWeek = () =>
  Object.fromEntries(
    Object.values(ScheduleDay)
      .filter(day => typeof day === 'number')
      .map(day => [day, []]),
  );

describe('DoctorScheduleService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: DoctorScheduleService;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new DoctorScheduleService(db, new DoctorService(db));
  });

  beforeEach(async () => {
    await clearDatabase(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('врач без расписания → все семь дней с пустыми списками', async () => {
    const doctor = await factories.doctor();

    const result = await service.getScheduleByDoctorId(doctor.id);

    expect(result).toEqual(emptyWeek());
  });

  it('раскладывает интервалы по дням, обрезает секунды и сортирует по началу', async () => {
    const doctor = await factories.doctor();
    await factories.schedule(doctor.id, {
      weekday: ScheduleDay.WEDNESDAY,
      startTime: '14:30:00',
      endTime: '18:00:00',
    });
    await factories.schedule(doctor.id, {
      weekday: ScheduleDay.WEDNESDAY,
      startTime: '09:00:00',
      endTime: '13:15:00',
    });
    await factories.schedule(doctor.id, {
      weekday: ScheduleDay.SUNDAY,
      startTime: '10:00:00',
      endTime: '12:00:00',
    });

    const result = await service.getScheduleByDoctorId(doctor.id);

    expect(result).toEqual({
      ...emptyWeek(),
      [ScheduleDay.WEDNESDAY]: [
        { start: '09:00', end: '13:15' },
        { start: '14:30', end: '18:00' },
      ],
      [ScheduleDay.SUNDAY]: [{ start: '10:00', end: '12:00' }],
    });
  });

  it('не включает расписание других врачей', async () => {
    const doctor = await factories.doctor();
    const other = await factories.doctor();
    await factories.schedule(other.id);

    const result = await service.getScheduleByDoctorId(doctor.id);

    expect(Object.values(result).flat()).toEqual([]);
  });

  it('несуществующий врач → NotFound', async () => {
    await expect(
      service.getScheduleByDoctorId(MISSING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
