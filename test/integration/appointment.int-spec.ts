import { ErrorCode } from 'src/common/errors/error-code';
import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import { Constraint } from 'src/db/constraints';
import type { Database } from 'src/db/db.module';
import { DoctorCategoryType } from 'src/db/enums';
import { getPgError } from 'src/db/errors';
import { appointment as appointmentTable } from 'src/db/schema';
import { AppointmentService } from 'src/domain/appointment/appointment.service';
import { AppointmentType } from 'src/domain/appointment/dto/appointment-query.dto';
import { clearDatabase, createTestDb } from './db';
import { createFactories } from './factories';
import { freezeDate } from './time';

const NOW = new Date('2026-10-29T12:00:00.000Z');

const MISSING_ID = '00000000-0000-4000-8000-000000000999';

const MOSCOW = 'Europe/Moscow';
const BERLIN = 'Europe/Berlin';

const sorted = (ids: string[]) => [...ids].sort((a, b) => a.localeCompare(b));

const addHalfHour = (time: string) =>
  dayjs(`2000-01-01T${time}`).add(30, 'minute').format('HH:mm:ss');

/** Ошибка драйвера о занятом слоте; в HTTP-ответ её превращает `AppErrorFilter` (проверяется в e2e). */
const isSlotTaken = (error: unknown) =>
  getPgError(error)?.constraint === Constraint.APPOINTMENT_TIME_SLOT_UNIQUE;

describe('AppointmentService (integration)', () => {
  let db: Database;
  let pool: Pool;
  let factories: ReturnType<typeof createFactories>;
  let service: AppointmentService;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    factories = createFactories(db);
    service = new AppointmentService(db);
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

  const stored = async (id: string) => {
    const [row] = await db
      .select()
      .from(appointmentTable)
      .where(eq(appointmentTable.id, id));

    return row;
  };

  const countOnSlot = async (timeSlotId: string) =>
    (
      await db
        .select()
        .from(appointmentTable)
        .where(eq(appointmentTable.timeSlotId, timeSlotId))
    ).length;

  /** Запись пользователя на новый слот будущего дня (`day` — число ноября 2026). */
  const bookFuture = async (userId: string, day: number, doctorId?: string) => {
    const doctor = doctorId ? { id: doctorId } : await factories.doctor();
    const slot = await factories.timeSlot(doctor.id, {
      date: `2026-11-${String(day).padStart(2, '0')}`,
    });

    return factories.appointment(userId, slot);
  };

  /** Запись на конкретное время; слот создаётся у переданного врача. */
  const bookAt = async (
    userId: string,
    doctorId: string,
    date: string,
    startTime: string,
    overrides: Partial<typeof appointmentTable.$inferInsert> = {},
  ) => {
    const slot = await factories.timeSlot(doctorId, {
      date,
      startTime,
      endTime: addHalfHour(startTime),
    });

    return factories.appointment(userId, slot, overrides);
  };

  const list = async (userId: string, type: AppointmentType, size = 100) => {
    const { data } = await service.getAppointmentsForUser(userId, {
      type,
      page: 1,
      size,
    });

    return data.map(a => a.id);
  };

  const listFuture = (userId: string, page = 1, size = 10) =>
    service.getAppointmentsForUser(userId, {
      type: AppointmentType.FUTURE,
      page,
      size,
    });

  describe('createAppointment', () => {
    it('saves the appointment with the time copied from the slot and returns it with the doctor', async () => {
      const user = await factories.user();
      const doctor = await factories.doctor();
      const slot = await factories.timeSlot(doctor.id, {
        date: '2026-11-03',
        startTime: '11:00:00',
        endTime: '11:30:00',
      });

      const result = await service.createAppointment(user.id, {
        timeSlotId: slot.id,
      });

      expect(result).toMatchObject({
        userId: user.id,
        doctorId: doctor.id,
        timeSlotId: slot.id,
        date: '2026-11-03',
        startTime: '11:00:00',
        endTime: '11:30:00',
        isCancelled: false,
        doctor: { id: doctor.id },
      });
      expect(await stored(result.id)).toMatchObject({ timeSlotId: slot.id });
    });

    it('throws NotFound when the time slot does not exist', async () => {
      const user = await factories.user();

      await expect(
        service.createAppointment(user.id, {
          timeSlotId: MISSING_ID,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.TIME_SLOT_NOT_FOUND });
    });

    it('throws BadRequest when the slot starts inside the booking window', async () => {
      const user = await factories.user();
      // 15:00 в Москве сейчас, окно записи 2 часа
      const doctor = await factories.doctor();
      const slot = await factories.timeSlot(doctor.id, {
        date: '2026-10-29',
        startTime: '16:59:59',
      });

      await expect(
        service.createAppointment(user.id, {
          timeSlotId: slot.id,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_TOO_SOON });
    });
  });

  describe('cancelAppointment', () => {
    it('throws BadRequest when the appointment is already cancelled', async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);
      await service.cancelAppointment(appointment.id, user.id);

      await expect(
        service.cancelAppointment(appointment.id, user.id),
      ).rejects.toMatchObject({
        code: ErrorCode.APPOINTMENT_ALREADY_CANCELLED,
      });
    });

    it('throws NotFound for a missing appointment', async () => {
      const user = await factories.user();

      await expect(
        service.cancelAppointment(MISSING_ID, user.id),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_NOT_FOUND });
    });

    it('marks the appointment cancelled, releases the slot and returns the doctor', async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);

      const result = await service.cancelAppointment(appointment.id, user.id);

      expect(result).toMatchObject({
        id: appointment.id,
        isCancelled: true,
        timeSlotId: null,
        doctor: { id: appointment.doctorId },
      });
      expect(await stored(appointment.id)).toMatchObject({
        isCancelled: true,
        timeSlotId: null,
      });
    });

    it('throws BadRequest for a past appointment and leaves it active', async () => {
      const user = await factories.user();
      const doctor = await factories.doctor();
      const past = await bookAt(user.id, doctor.id, '2026-10-29', '14:00:00');

      await expect(
        service.cancelAppointment(past.id, user.id),
      ).rejects.toMatchObject({
        code: ErrorCode.APPOINTMENT_PAST_CANNOT_CANCEL,
      });
      expect((await stored(past.id)).isCancelled).toBe(false);
    });

    it('judges whether the appointment started by the timezone of its medical center', async () => {
      const user = await factories.user();
      // 14:30 по часам центра: в Берлине (13:30Z) ещё впереди, в Москве (11:30Z) уже началось
      const berlin = await factories.doctor({
        medicalCenterId: (await factories.medicalCenter({ timezone: BERLIN }))
          .id,
      });
      const moscow = await factories.doctor({
        medicalCenterId: (await factories.medicalCenter({ timezone: MOSCOW }))
          .id,
      });
      const inBerlin = await bookAt(
        user.id,
        berlin.id,
        '2026-10-29',
        '14:30:00',
      );
      const inMoscow = await bookAt(
        user.id,
        moscow.id,
        '2026-10-29',
        '14:30:00',
      );

      await expect(
        service.cancelAppointment(inBerlin.id, user.id),
      ).resolves.toMatchObject({ isCancelled: true });
      await expect(
        service.cancelAppointment(inMoscow.id, user.id),
      ).rejects.toMatchObject({
        code: ErrorCode.APPOINTMENT_PAST_CANNOT_CANCEL,
      });
    });
    // I2
    it("does not cancel another user's appointment and leaves it active", async () => {
      const owner = await factories.user();
      const stranger = await factories.user();
      const appointment = await bookFuture(owner.id, 3);

      await expect(
        service.cancelAppointment(appointment.id, stranger.id),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_NOT_FOUND });

      const row = await stored(appointment.id);
      expect(row.isCancelled).toBe(false);
      expect(row.timeSlotId).toBe(appointment.timeSlotId);
    });

    // I1
    it('frees the slot for another user and keeps the cancelled appointment in history', async () => {
      const owner = await factories.user();
      const other = await factories.user();
      const appointment = await bookFuture(owner.id, 3);

      await service.cancelAppointment(appointment.id, owner.id);

      const rebooked = await service.createAppointment(other.id, {
        timeSlotId: appointment.timeSlotId!,
      });
      expect(rebooked.timeSlotId).toBe(appointment.timeSlotId);
      expect(await list(owner.id, AppointmentType.CANCELED)).toEqual([
        appointment.id,
      ]);
    });
  });

  describe('rescheduleAppointment', () => {
    it('throws NotFound for a missing appointment or a missing new slot', async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);

      await expect(
        service.rescheduleAppointment(MISSING_ID, user.id, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_NOT_FOUND });
      await expect(
        service.rescheduleAppointment(appointment.id, user.id, MISSING_ID),
      ).rejects.toMatchObject({ code: ErrorCode.TIME_SLOT_NOT_FOUND });
    });

    it('throws BadRequest for a cancelled appointment', async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);
      const newSlot = await factories.timeSlot(appointment.doctorId, {
        date: '2026-11-05',
      });
      await service.cancelAppointment(appointment.id, user.id);

      await expect(
        service.rescheduleAppointment(appointment.id, user.id, newSlot.id),
      ).rejects.toMatchObject({
        code: ErrorCode.APPOINTMENT_CANCELLED_CANNOT_RESCHEDULE,
      });
    });

    it('throws BadRequest when the current appointment is inside the booking window', async () => {
      const user = await factories.user();
      const doctor = await factories.doctor();
      const soon = await bookAt(user.id, doctor.id, '2026-10-29', '16:59:59');
      const newSlot = await factories.timeSlot(doctor.id, {
        date: '2026-11-05',
      });

      await expect(
        service.rescheduleAppointment(soon.id, user.id, newSlot.id),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_TOO_SOON });
      expect((await stored(soon.id)).timeSlotId).toBe(soon.timeSlotId);
    });

    it('throws BadRequest, not Conflict, when moving to the current slot', async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);

      await expect(
        service.rescheduleAppointment(
          appointment.id,
          user.id,
          appointment.timeSlotId!,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_SAME_SLOT });
    });

    it("throws BadRequest for another doctor's slot", async () => {
      const user = await factories.user();
      const appointment = await bookFuture(user.id, 3);
      const otherSlot = await factories.timeSlot(
        (await factories.doctor()).id,
        { date: '2026-11-05' },
      );

      await expect(
        service.rescheduleAppointment(appointment.id, user.id, otherSlot.id),
      ).rejects.toMatchObject({ code: ErrorCode.TIME_SLOT_DOCTOR_MISMATCH });
    });
    it("does not move another user's appointment and leaves it unchanged", async () => {
      const owner = await factories.user();
      const stranger = await factories.user();
      const appointment = await bookFuture(owner.id, 3);
      const newSlot = await factories.timeSlot(appointment.doctorId, {
        date: '2026-11-05',
      });

      await expect(
        service.rescheduleAppointment(appointment.id, stranger.id, newSlot.id),
      ).rejects.toMatchObject({ code: ErrorCode.APPOINTMENT_NOT_FOUND });

      const row = await stored(appointment.id);
      expect(row.timeSlotId).toBe(appointment.timeSlotId);
      expect(row.date).toBe(appointment.date);
    });

    // I4
    it('frees the old slot for another user and moves the appointment to the new one', async () => {
      const owner = await factories.user();
      const other = await factories.user();
      const appointment = await bookFuture(owner.id, 3);
      const newSlot = await factories.timeSlot(appointment.doctorId, {
        date: '2026-11-05',
        startTime: '12:00:00',
        endTime: '12:30:00',
      });

      await service.rescheduleAppointment(appointment.id, owner.id, newSlot.id);

      const moved = await stored(appointment.id);
      expect(moved).toMatchObject({
        timeSlotId: newSlot.id,
        date: '2026-11-05',
        startTime: '12:00:00',
        isCancelled: false,
      });
      await expect(
        service.createAppointment(other.id, {
          timeSlotId: appointment.timeSlotId!,
        }),
      ).resolves.toMatchObject({ timeSlotId: appointment.timeSlotId });
    });
  });

  describe('booking the same slot twice', () => {
    it('rejects with slot-taken violation on the second create and keeps a single appointment', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const winner = await bookFuture(first.id, 3);

      await expect(
        service.createAppointment(second.id, {
          timeSlotId: winner.timeSlotId!,
        }),
      ).rejects.toMatchObject({
        cause: { constraint: Constraint.APPOINTMENT_TIME_SLOT_UNIQUE },
      });
      expect(await countOnSlot(winner.timeSlotId!)).toBe(1);
    });

    it('rejects the reschedule onto a taken slot and leaves the appointment unchanged', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const taken = await bookFuture(first.id, 3);
      const mover = await bookFuture(second.id, 4, taken.doctorId);

      await expect(
        service.rescheduleAppointment(mover.id, second.id, taken.timeSlotId!),
      ).rejects.toMatchObject({
        cause: { constraint: Constraint.APPOINTMENT_TIME_SLOT_UNIQUE },
      });

      expect((await stored(mover.id)).timeSlotId).toBe(mover.timeSlotId);
    });

    it('lets exactly one of two parallel creates win, the other is rejected with slot-taken violation', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const doctor = await factories.doctor();
      const slot = await factories.timeSlot(doctor.id, { date: '2026-11-03' });
      const dto = { timeSlotId: slot.id };

      const results = await Promise.allSettled([
        service.createAppointment(first.id, dto),
        service.createAppointment(second.id, dto),
      ]);

      const rejected = results.filter(r => r.status === 'rejected');
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(isSlotTaken(rejected[0].reason)).toBe(true);
      expect(await countOnSlot(slot.id)).toBe(1);
    });
  });

  describe('getAppointmentsForUser', () => {
    // I7
    it('lists only appointments of the requested user', async () => {
      const user = await factories.user();
      const other = await factories.user();
      const own = [await bookFuture(user.id, 3), await bookFuture(user.id, 4)];
      await bookFuture(other.id, 5);

      const { data, hasMore } = await listFuture(user.id);

      expect(data.map(a => a.id)).toEqual(own.map(a => a.id));
      expect(hasMore).toBe(false);
    });

    // I8
    it('paginates by appointments: every one appears on exactly one page', async () => {
      const user = await factories.user();
      const other = await factories.user();
      const own = [];
      for (const day of [3, 4, 5, 6, 7]) {
        own.push(await bookFuture(user.id, day));
      }
      await bookFuture(other.id, 8);

      const pages = [
        await listFuture(user.id, 1, 2),
        await listFuture(user.id, 2, 2),
        await listFuture(user.id, 3, 2),
      ];

      expect(pages.map(p => p.data.length)).toEqual([2, 2, 1]);
      expect(pages.map(p => p.hasMore)).toEqual([true, true, false]);
      expect(pages.flatMap(p => p.data.map(a => a.id))).toEqual(
        own.map(a => a.id),
      );
    });

    // I9
    it('includes the medical center name and address and the doctor category type', async () => {
      const user = await factories.user();
      const medicalCenter = await factories.medicalCenter({
        name: 'Клиника «Лотос»',
        address: 'ул. Красная Пресня, д. 9',
      });
      const category = await factories.category({
        type: DoctorCategoryType.CARDIOLOGY,
      });
      const doctor = await factories.doctor({
        medicalCenterId: medicalCenter.id,
        categoryId: category.id,
      });
      await bookFuture(user.id, 3, doctor.id);

      const { data } = await listFuture(user.id);

      expect(data[0].doctor.medicalCenter).toMatchObject({
        name: 'Клиника «Лотос»',
        address: 'ул. Красная Пресня, д. 9',
      });
      expect(data[0].doctor.category).toMatchObject({
        type: DoctorCategoryType.CARDIOLOGY,
      });
    });

    // I5
    describe('splits appointments into FUTURE, PAST and CANCELED', () => {
      type Case = {
        title: string;
        zone: typeof MOSCOW | typeof BERLIN;
        date: string;
        startTime: string;
        expected: 'FUTURE' | 'PAST';
      };

      const classify = async (userId: string) => ({
        future: await list(userId, AppointmentType.FUTURE),
        past: await list(userId, AppointmentType.PAST),
        canceled: await list(userId, AppointmentType.CANCELED),
      });

      const placeAll = async (userId: string, cases: Case[]) => {
        const doctors = {
          [MOSCOW]: await factories.doctor({
            medicalCenterId: (
              await factories.medicalCenter({ timezone: MOSCOW })
            ).id,
          }),
          [BERLIN]: await factories.doctor({
            medicalCenterId: (
              await factories.medicalCenter({ timezone: BERLIN })
            ).id,
          }),
        };
        const placed: { id: string; testCase: Case }[] = [];

        for (const testCase of cases) {
          const appointment = await bookAt(
            userId,
            doctors[testCase.zone].id,
            testCase.date,
            testCase.startTime,
          );
          placed.push({ id: appointment.id, testCase });
        }

        return placed;
      };

      const expectLists = async (
        userId: string,
        placed: { id: string; testCase: Case }[],
      ) => {
        const lists = await classify(userId);
        const idsOf = (expected: Case['expected']) =>
          placed.filter(p => p.testCase.expected === expected).map(p => p.id);

        expect(sorted(lists.future)).toEqual(sorted(idsOf('FUTURE')));
        expect(sorted(lists.past)).toEqual(sorted(idsOf('PAST')));
        expect(lists.canceled).toEqual([]);
      };

      // Сейчас 15:00:00 в Москве (UTC+3) и 13:00:00 в Берлине (UTC+1).
      it('compares the start with now on the clock of the medical center', async () => {
        const user = await factories.user();
        const placed = await placeAll(user.id, [
          {
            title: 'Moscow, 1s ago',
            zone: MOSCOW,
            date: '2026-10-29',
            startTime: '14:59:59',
            expected: 'PAST',
          },
          {
            title: 'Moscow, exactly now',
            zone: MOSCOW,
            date: '2026-10-29',
            startTime: '15:00:00',
            expected: 'PAST',
          },
          {
            title: 'Moscow, in 1s',
            zone: MOSCOW,
            date: '2026-10-29',
            startTime: '15:00:01',
            expected: 'FUTURE',
          },
          {
            title: 'Berlin, 1s ago',
            zone: BERLIN,
            date: '2026-10-29',
            startTime: '12:59:59',
            expected: 'PAST',
          },
          {
            title: 'Berlin, exactly now',
            zone: BERLIN,
            date: '2026-10-29',
            startTime: '13:00:00',
            expected: 'PAST',
          },
          // 14:00 в Москве уже прошло бы, а в Берлине ещё впереди
          {
            title: 'Berlin, in 1h',
            zone: BERLIN,
            date: '2026-10-29',
            startTime: '14:00:00',
            expected: 'FUTURE',
          },
        ]);

        await expectLists(user.id, placed);
      });

      // Сейчас 22:30Z: в Москве уже 30 октября 01:30, в Берлине ещё 29 октября 23:30.
      it('handles the midnight boundary where the UTC date differs from the local one', async () => {
        freezeDate(new Date('2026-10-29T22:30:00.000Z'));
        const user = await factories.user();
        const placed = await placeAll(user.id, [
          {
            title: 'Moscow, past after local midnight',
            zone: MOSCOW,
            date: '2026-10-30',
            startTime: '01:00:00',
            expected: 'PAST',
          },
          {
            title: 'Moscow, future after local midnight',
            zone: MOSCOW,
            date: '2026-10-30',
            startTime: '02:00:00',
            expected: 'FUTURE',
          },
          {
            title: 'Berlin, past before local midnight',
            zone: BERLIN,
            date: '2026-10-29',
            startTime: '23:15:00',
            expected: 'PAST',
          },
          {
            title: 'Berlin, future before local midnight',
            zone: BERLIN,
            date: '2026-10-29',
            startTime: '23:45:00',
            expected: 'FUTURE',
          },
          {
            title: 'Berlin, future next day',
            zone: BERLIN,
            date: '2026-10-30',
            startTime: '00:00:00',
            expected: 'FUTURE',
          },
        ]);

        await expectLists(user.id, placed);
      });

      it('shows a cancelled appointment only in CANCELED, whenever it was scheduled', async () => {
        const user = await factories.user();
        const doctor = await factories.doctor();
        const cancelled = { isCancelled: true, timeSlotId: null };
        const inFuture = await bookAt(
          user.id,
          doctor.id,
          '2026-11-03',
          '10:00:00',
          cancelled,
        );
        const inPast = await bookAt(
          user.id,
          doctor.id,
          '2026-10-20',
          '10:00:00',
          cancelled,
        );

        const lists = await classify(user.id);

        expect(sorted(lists.canceled)).toEqual(
          sorted([inFuture.id, inPast.id]),
        );
        expect(lists.future).toEqual([]);
        expect(lists.past).toEqual([]);
      });
    });

    // I6
    describe('orders the lists', () => {
      it('sorts FUTURE ascending and PAST and CANCELED descending, ties broken by start time', async () => {
        const user = await factories.user();
        const doctor = await factories.doctor();
        const cancelled = { isCancelled: true, timeSlotId: null };
        // создаём вперемешку, чтобы порядок не совпал со вставкой
        const future2 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-04',
          '08:00:00',
        );
        const future1 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-03',
          '15:00:00',
        );
        const future0 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-03',
          '09:00:00',
        );
        const past0 = await bookAt(
          user.id,
          doctor.id,
          '2026-10-20',
          '10:00:00',
        );
        const past2 = await bookAt(
          user.id,
          doctor.id,
          '2026-10-25',
          '09:00:00',
        );
        const past1 = await bookAt(
          user.id,
          doctor.id,
          '2026-10-20',
          '16:00:00',
        );
        const canceled0 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-01',
          '10:00:00',
          cancelled,
        );
        const canceled2 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-09',
          '09:00:00',
          cancelled,
        );
        const canceled1 = await bookAt(
          user.id,
          doctor.id,
          '2026-11-01',
          '18:00:00',
          cancelled,
        );

        expect(await list(user.id, AppointmentType.FUTURE)).toEqual(
          [future0, future1, future2].map(a => a.id),
        );
        expect(await list(user.id, AppointmentType.PAST)).toEqual(
          [past2, past1, past0].map(a => a.id),
        );
        expect(await list(user.id, AppointmentType.CANCELED)).toEqual(
          [canceled2, canceled1, canceled0].map(a => a.id),
        );
      });

      // Сейчас 15:00 в Москве (UTC+3) и 13:00 в Берлине (UTC+1).
      it('orders by the absolute start across time zones, not by the local clock', async () => {
        const user = await factories.user();
        const moscow = await factories.doctor({
          medicalCenterId: (await factories.medicalCenter({ timezone: MOSCOW }))
            .id,
        });
        const berlin = await factories.doctor({
          medicalCenterId: (await factories.medicalCenter({ timezone: BERLIN }))
            .id,
        });
        const cancelled = { isCancelled: true, timeSlotId: null };

        // 07:00Z, 08:00Z и 09:00Z (стык суток: 23:30 Москвы позже 21:30 Берлина)
        const berlinLater = await bookAt(
          user.id,
          berlin.id,
          '2026-11-03',
          '09:00:00',
        );
        const moscowEarlier = await bookAt(
          user.id,
          moscow.id,
          '2026-11-03',
          '10:00:00',
        );
        const moscowLast = await bookAt(
          user.id,
          moscow.id,
          '2026-11-03',
          '12:00:00',
        );
        const moscowNight = await bookAt(
          user.id,
          moscow.id,
          '2026-11-04',
          '00:30:00',
        );
        const berlinNight = await bookAt(
          user.id,
          berlin.id,
          '2026-11-03',
          '23:30:00',
        );
        const berlinCancelled = await bookAt(
          user.id,
          berlin.id,
          '2026-11-03',
          '09:00:00',
          cancelled,
        );
        const moscowCancelled = await bookAt(
          user.id,
          moscow.id,
          '2026-11-03',
          '10:00:00',
          cancelled,
        );

        expect(await list(user.id, AppointmentType.FUTURE)).toEqual(
          [
            moscowEarlier,
            berlinLater,
            moscowLast,
            moscowNight,
            berlinNight,
          ].map(a => a.id),
        );
        // CANCELED по убыванию: берлинский 09:00 (08:00Z) позже московского 10:00 (07:00Z)
        expect(await list(user.id, AppointmentType.CANCELED)).toEqual(
          [berlinCancelled, moscowCancelled].map(a => a.id),
        );
      });
    });
  });
});
