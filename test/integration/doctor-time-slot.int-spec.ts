import { ErrorCode } from 'src/common/errors/error-code';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import type { doctorTimeSlot } from 'src/db/schema';
import { DoctorTimeSlotService } from 'src/domain/doctor/modules/doctor-time-slot/doctor-time-slot.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';
import { freezeDate } from './time';

// 15:00 in Moscow, 13:00 in Berlin
const NOW = new Date('2026-10-29T12:00:00.000Z');
// 01:30 on 30.10 in Moscow, but still 22:30 on 29.10 in UTC
const NOW_NEAR_MIDNIGHT = new Date('2026-10-29T22:30:00.000Z');

const MOSCOW = 'Europe/Moscow';
const BERLIN = 'Europe/Berlin';

const WIDE_RANGE = ['2026-10-01', '2026-12-31'] as const;

describe('DoctorTimeSlotService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: DoctorTimeSlotService;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new DoctorTimeSlotService(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    freezeDate(NOW);
    await clearDatabase(db);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const doctorIn = async (timezone = MOSCOW) =>
    factories.doctor({
      medicalCenterId: (await factories.medicalCenter({ timezone })).id,
    });

  const slot = (
    doctorId: string,
    date: string,
    startTime: string,
    endTime = startTime,
  ) => factories.timeSlot(doctorId, { date, startTime, endTime });

  const book = async (timeSlot: typeof doctorTimeSlot.$inferSelect) => {
    const user = await factories.user();

    return factories.appointment(user.id, timeSlot);
  };

  const dayOf = (days: Awaited<ReturnType<typeof service.getAvailable>>) =>
    days.map(day => ({ date: day.date, ids: day.slots.map(s => s.id) }));

  describe('getAvailable', () => {
    it('returns slots by date ascending, time in HH:mm', async () => {
      const doctor = await doctorIn();
      const later = await slot(doctor.id, '2026-11-04', '09:00:00', '09:30:00');
      const lateEvening = await slot(
        doctor.id,
        '2026-11-03',
        '16:00:00',
        '16:30:00',
      );
      const early = await slot(doctor.id, '2026-11-03', '10:00:00', '10:30:00');

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(result).toEqual([
        {
          date: '2026-11-03',
          slots: [
            { id: early.id, startTime: '10:00', endTime: '10:30' },
            { id: lateEvening.id, startTime: '16:00', endTime: '16:30' },
          ],
        },
        {
          date: '2026-11-04',
          slots: [{ id: later.id, startTime: '09:00', endTime: '09:30' }],
        },
      ]);
    });

    it('does not return slots of another doctor', async () => {
      const doctor = await doctorIn();
      const other = await doctorIn();
      const own = await slot(doctor.id, '2026-11-03', '10:00:00');
      await slot(other.id, '2026-11-03', '11:00:00');

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-11-03', ids: [own.id] }]);
    });

    it('range bounds are inclusive, slots outside it are excluded', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-11-02', '10:00:00');
      const first = await slot(doctor.id, '2026-11-03', '10:00:00');
      const last = await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-06', '10:00:00');

      const result = await service.getAvailable(
        doctor.id,
        '2026-11-03',
        '2026-11-05',
      );

      expect(dayOf(result)).toEqual([
        { date: '2026-11-03', ids: [first.id] },
        { date: '2026-11-05', ids: [last.id] },
      ]);
    });

    it('hides booked slots and omits a day without free slots', async () => {
      const doctor = await doctorIn();
      const taken = await slot(doctor.id, '2026-11-03', '10:00:00');
      const fullyBookedDay = await slot(doctor.id, '2026-11-04', '10:00:00');
      const free = await slot(doctor.id, '2026-11-03', '11:00:00');
      await book(taken);
      await book(fullyBookedDay);

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-11-03', ids: [free.id] }]);
    });

    it('hides slots of past days', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-28', '23:00:00');
      const tomorrow = await slot(doctor.id, '2026-10-30', '08:00:00');

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([
        { date: '2026-10-30', ids: [tomorrow.id] },
      ]);
    });

    it('today hides slots not later than "now" (including exactly now), shows later ones', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '14:59:00');
      await slot(doctor.id, '2026-10-29', '15:00:00');
      const after = await slot(doctor.id, '2026-10-29', '15:01:00');

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-10-29', ids: [after.id] }]);
    });

    it('"now" is computed in the time zone of the doctor center', async () => {
      // for one moment it is 13:00 in Berlin and 15:00 in Moscow
      const berlin = await doctorIn(BERLIN);
      const moscow = await doctorIn(MOSCOW);
      const berlinSlot = await slot(berlin.id, '2026-10-29', '14:00:00');
      await slot(moscow.id, '2026-10-29', '14:00:00');

      const inBerlin = await service.getAvailable(berlin.id, ...WIDE_RANGE);
      const inMoscow = await service.getAvailable(moscow.id, ...WIDE_RANGE);

      expect(dayOf(inBerlin)).toEqual([
        { date: '2026-10-29', ids: [berlinSlot.id] },
      ]);
      expect(inMoscow).toEqual([]);
    });

    it('the "today" date is taken from the center clock when it is still yesterday in UTC', async () => {
      freezeDate(NOW_NEAR_MIDNIGHT);
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '23:00:00');
      await slot(doctor.id, '2026-10-30', '01:00:00');
      const upcoming = await slot(doctor.id, '2026-10-30', '02:00:00');

      const result = await service.getAvailable(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([
        { date: '2026-10-30', ids: [upcoming.id] },
      ]);
    });

    it('nonexistent doctor → DOCTOR_NOT_FOUND', async () => {
      await expect(
        service.getAvailable(
          '00000000-0000-4000-8000-000000000000',
          ...WIDE_RANGE,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.DOCTOR_NOT_FOUND });
    });
  });

  describe('getAvailableRange', () => {
    it('takes min/max only over the slots of this doctor', async () => {
      const doctor = await doctorIn();
      const other = await doctorIn();
      await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-09', '10:00:00');
      await slot(doctor.id, '2026-11-07', '10:00:00');
      await slot(other.id, '2026-11-01', '10:00:00');
      await slot(other.id, '2026-11-20', '10:00:00');

      await expect(service.getAvailableRange(doctor.id)).resolves.toEqual({
        minDate: '2026-11-05',
        maxDate: '2026-11-09',
      });
    });

    it('booked slots do not affect the range', async () => {
      const doctor = await doctorIn();
      await book(await slot(doctor.id, '2026-11-03', '10:00:00'));
      await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-07', '10:00:00');
      await book(await slot(doctor.id, '2026-11-09', '10:00:00'));

      await expect(service.getAvailableRange(doctor.id)).resolves.toEqual({
        minDate: '2026-11-05',
        maxDate: '2026-11-07',
      });
    });

    it('past slots do not affect the range, "now" is on the center clock', async () => {
      freezeDate(NOW_NEAR_MIDNIGHT);
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '23:00:00');
      await slot(doctor.id, '2026-10-30', '01:00:00');
      await slot(doctor.id, '2026-10-30', '02:00:00');
      await slot(doctor.id, '2026-11-02', '10:00:00');

      await expect(service.getAvailableRange(doctor.id)).resolves.toEqual({
        minDate: '2026-10-30',
        maxDate: '2026-11-02',
      });
    });

    it('a slot exactly at "now" is not in the range', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '15:00:00');
      await slot(doctor.id, '2026-10-30', '10:00:00');

      await expect(service.getAvailableRange(doctor.id)).resolves.toEqual({
        minDate: '2026-10-30',
        maxDate: '2026-10-30',
      });
    });

    it('no free future slots (booked or past) → NO_AVAILABLE_SLOTS', async () => {
      const doctor = await doctorIn();
      await book(await slot(doctor.id, '2026-11-03', '10:00:00'));
      await slot(doctor.id, '2026-10-28', '10:00:00');

      await expect(service.getAvailableRange(doctor.id)).rejects.toMatchObject({
        code: ErrorCode.NO_AVAILABLE_SLOTS,
      });
    });
  });
});
