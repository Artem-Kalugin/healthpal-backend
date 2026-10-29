import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { Database } from 'src/db/db.module';
import type { doctorTimeSlot } from 'src/db/schema';
import { DoctorTimeSlotService } from 'src/domain/doctor/modules/doctor-time-slot/doctor-time-slot.service';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';
import { freezeDate } from './time';

// 15:00 в Москве, 13:00 в Берлине
const NOW = new Date('2026-10-29T12:00:00.000Z');
// 01:30 30.10 в Москве, но ещё 22:30 29.10 в UTC
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

  const dayOf = (days: Awaited<ReturnType<typeof service.getSlotsForDoctor>>) =>
    days.map(day => ({ date: day.date, ids: day.slots.map(s => s.id) }));

  describe('getSlotsForDoctor', () => {
    it('отдаёт слоты по датам по возрастанию, время в HH:mm', async () => {
      const doctor = await doctorIn();
      const later = await slot(doctor.id, '2026-11-04', '09:00:00', '09:30:00');
      const lateEvening = await slot(
        doctor.id,
        '2026-11-03',
        '16:00:00',
        '16:30:00',
      );
      const early = await slot(doctor.id, '2026-11-03', '10:00:00', '10:30:00');

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

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

    it('не отдаёт слоты другого врача', async () => {
      const doctor = await doctorIn();
      const other = await doctorIn();
      const own = await slot(doctor.id, '2026-11-03', '10:00:00');
      await slot(other.id, '2026-11-03', '11:00:00');

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-11-03', ids: [own.id] }]);
    });

    it('границы диапазона включительные, слоты вне него не попадают', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-11-02', '10:00:00');
      const first = await slot(doctor.id, '2026-11-03', '10:00:00');
      const last = await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-06', '10:00:00');

      const result = await service.getSlotsForDoctor(
        doctor.id,
        '2026-11-03',
        '2026-11-05',
      );

      expect(dayOf(result)).toEqual([
        { date: '2026-11-03', ids: [first.id] },
        { date: '2026-11-05', ids: [last.id] },
      ]);
    });

    it('скрывает занятые слоты, а день без свободных слотов не отдаёт', async () => {
      const doctor = await doctorIn();
      const taken = await slot(doctor.id, '2026-11-03', '10:00:00');
      const fullyBookedDay = await slot(doctor.id, '2026-11-04', '10:00:00');
      const free = await slot(doctor.id, '2026-11-03', '11:00:00');
      await book(taken);
      await book(fullyBookedDay);

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-11-03', ids: [free.id] }]);
    });

    it('скрывает слоты прошедших дней', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-28', '23:00:00');
      const tomorrow = await slot(doctor.id, '2026-10-30', '08:00:00');

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([
        { date: '2026-10-30', ids: [tomorrow.id] },
      ]);
    });

    it('сегодня скрывает слоты не позже «сейчас» (включая ровно сейчас), показывает позже', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '14:59:00');
      await slot(doctor.id, '2026-10-29', '15:00:00');
      const after = await slot(doctor.id, '2026-10-29', '15:01:00');

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([{ date: '2026-10-29', ids: [after.id] }]);
    });

    it('«сейчас» считается по поясу центра врача', async () => {
      // для одного момента в Берлине 13:00, в Москве 15:00
      const berlin = await doctorIn(BERLIN);
      const moscow = await doctorIn(MOSCOW);
      const berlinSlot = await slot(berlin.id, '2026-10-29', '14:00:00');
      await slot(moscow.id, '2026-10-29', '14:00:00');

      const inBerlin = await service.getSlotsForDoctor(
        berlin.id,
        ...WIDE_RANGE,
      );
      const inMoscow = await service.getSlotsForDoctor(
        moscow.id,
        ...WIDE_RANGE,
      );

      expect(dayOf(inBerlin)).toEqual([
        { date: '2026-10-29', ids: [berlinSlot.id] },
      ]);
      expect(inMoscow).toEqual([]);
    });

    it('дата «сегодня» берётся по часам центра, когда в UTC ещё вчера', async () => {
      freezeDate(NOW_NEAR_MIDNIGHT);
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '23:00:00');
      await slot(doctor.id, '2026-10-30', '01:00:00');
      const upcoming = await slot(doctor.id, '2026-10-30', '02:00:00');

      const result = await service.getSlotsForDoctor(doctor.id, ...WIDE_RANGE);

      expect(dayOf(result)).toEqual([
        { date: '2026-10-30', ids: [upcoming.id] },
      ]);
    });

    it('несуществующий врач → NotFoundException', async () => {
      await expect(
        service.getSlotsForDoctor(
          '00000000-0000-4000-8000-000000000000',
          ...WIDE_RANGE,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getSlotsRange', () => {
    it('берёт min/max только по слотам этого врача', async () => {
      const doctor = await doctorIn();
      const other = await doctorIn();
      await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-09', '10:00:00');
      await slot(doctor.id, '2026-11-07', '10:00:00');
      await slot(other.id, '2026-11-01', '10:00:00');
      await slot(other.id, '2026-11-20', '10:00:00');

      await expect(service.getSlotsRange(doctor.id)).resolves.toEqual({
        minDate: '2026-11-05',
        maxDate: '2026-11-09',
      });
    });

    it('занятые слоты не влияют на диапазон', async () => {
      const doctor = await doctorIn();
      await book(await slot(doctor.id, '2026-11-03', '10:00:00'));
      await slot(doctor.id, '2026-11-05', '10:00:00');
      await slot(doctor.id, '2026-11-07', '10:00:00');
      await book(await slot(doctor.id, '2026-11-09', '10:00:00'));

      await expect(service.getSlotsRange(doctor.id)).resolves.toEqual({
        minDate: '2026-11-05',
        maxDate: '2026-11-07',
      });
    });

    it('прошедшие слоты не влияют на диапазон, «сейчас» по часам центра', async () => {
      freezeDate(NOW_NEAR_MIDNIGHT);
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '23:00:00');
      await slot(doctor.id, '2026-10-30', '01:00:00');
      await slot(doctor.id, '2026-10-30', '02:00:00');
      await slot(doctor.id, '2026-11-02', '10:00:00');

      await expect(service.getSlotsRange(doctor.id)).resolves.toEqual({
        minDate: '2026-10-30',
        maxDate: '2026-11-02',
      });
    });

    it('слот ровно в «сейчас» в диапазон не входит', async () => {
      const doctor = await doctorIn();
      await slot(doctor.id, '2026-10-29', '15:00:00');
      await slot(doctor.id, '2026-10-30', '10:00:00');

      await expect(service.getSlotsRange(doctor.id)).resolves.toEqual({
        minDate: '2026-10-30',
        maxDate: '2026-10-30',
      });
    });

    it('нет свободных будущих слотов (заняты или прошли) → NotFoundException', async () => {
      const doctor = await doctorIn();
      await book(await slot(doctor.id, '2026-11-03', '10:00:00'));
      await slot(doctor.id, '2026-10-28', '10:00:00');

      await expect(service.getSlotsRange(doctor.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
