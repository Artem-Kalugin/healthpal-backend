import { ConflictException, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import { DataSource } from 'typeorm';
import { DatabaseEntityError } from 'src/common/errors/database-entity/database-entity.error';
import { DatabaseEntityUniqueConstraintError } from 'src/common/errors/database-entity/database-entity-unique-constraint.error';
import { createSafeRepository } from 'src/common/helpers/safe-repository.provider';
import { AppointmentService } from 'src/domain/appointment/appointment.service';
import { AppointmentType } from 'src/domain/appointment/dto/appointment-query.dto';
import { Appointment } from 'src/entities/appointment.entity';
import { DoctorCategoryType } from 'src/entities/doctor-category.entity';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { clearDatabase, createTestDataSource } from './db';
import { createFactories } from './factories';
import { freezeDate } from './time';

const NOW = new Date('2026-10-29T12:00:00.000Z');

const MOSCOW = 'Europe/Moscow';
const BERLIN = 'Europe/Berlin';

const sorted = (ids: string[]) => [...ids].sort((a, b) => a.localeCompare(b));

const addHalfHour = (time: string) =>
  dayjs(`2000-01-01T${time}`).add(30, 'minute').format('HH:mm:ss');

describe('AppointmentService (integration)', () => {
  let dataSource: DataSource;
  let factories: ReturnType<typeof createFactories>;
  let appointmentRepo: ReturnType<typeof createSafeRepository<Appointment>>;
  let service: AppointmentService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    factories = createFactories(dataSource);
    appointmentRepo = createSafeRepository(
      dataSource.getRepository(Appointment),
    );
    service = new AppointmentService(
      appointmentRepo,
      createSafeRepository(dataSource.getRepository(DoctorTimeSlot)),
      createSafeRepository(dataSource.getRepository(Doctor)),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    freezeDate(NOW);
    await clearDatabase(dataSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

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
    overrides: Partial<Appointment> = {},
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

  describe('cancelAppointment', () => {
    // I2
    it("does not cancel another user's appointment and leaves it active", async () => {
      const owner = await factories.user();
      const stranger = await factories.user();
      const appointment = await bookFuture(owner.id, 3);

      await expect(
        service.cancelAppointment(appointment.id, stranger.id),
      ).rejects.toThrow(NotFoundException);

      const stored = await dataSource
        .getRepository(Appointment)
        .findOneByOrFail({ id: appointment.id });
      expect(stored.isCancelled).toBe(false);
      expect(stored.timeSlotId).toBe(appointment.timeSlotId);
    });

    // I1
    it('frees the slot for another user and keeps the cancelled appointment in history', async () => {
      const owner = await factories.user();
      const other = await factories.user();
      const appointment = await bookFuture(owner.id, 3);

      await service.cancelAppointment(appointment.id, owner.id);

      const rebooked = await service.createAppointment(other.id, {
        doctorId: appointment.doctorId,
        timeSlotId: appointment.timeSlotId!,
      });
      expect(rebooked.timeSlotId).toBe(appointment.timeSlotId);
      expect(await list(owner.id, AppointmentType.CANCELED)).toEqual([
        appointment.id,
      ]);
    });
  });

  describe('rescheduleAppointment', () => {
    it("does not move another user's appointment and leaves it unchanged", async () => {
      const owner = await factories.user();
      const stranger = await factories.user();
      const appointment = await bookFuture(owner.id, 3);
      const newSlot = await factories.timeSlot(appointment.doctorId, {
        date: '2026-11-05',
      });

      await expect(
        service.rescheduleAppointment(appointment.id, stranger.id, newSlot.id),
      ).rejects.toThrow(NotFoundException);

      const stored = await dataSource
        .getRepository(Appointment)
        .findOneByOrFail({ id: appointment.id });
      expect(stored.timeSlotId).toBe(appointment.timeSlotId);
      expect(stored.date).toBe(appointment.date);
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

      const moved = await dataSource
        .getRepository(Appointment)
        .findOneByOrFail({ id: appointment.id });
      expect(moved).toMatchObject({
        timeSlotId: newSlot.id,
        date: '2026-11-05',
        startTime: '12:00:00',
        isCancelled: false,
      });
      await expect(
        service.createAppointment(other.id, {
          doctorId: appointment.doctorId,
          timeSlotId: appointment.timeSlotId!,
        }),
      ).resolves.toMatchObject({ timeSlotId: appointment.timeSlotId });
    });
  });

  describe('booking the same slot concurrently', () => {
    // I3: оба запроса проходят проверку «слот свободен» и упираются в уникальный индекс
    it('answers 409 to the second create when the free-slot check was already passed', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const winner = await bookFuture(first.id, 3);
      jest.spyOn(appointmentRepo, 'findOne').mockResolvedValueOnce(null);

      const result = service.createAppointment(second.id, {
        doctorId: winner.doctorId,
        timeSlotId: winner.timeSlotId!,
      });

      await expect(result).rejects.toBeInstanceOf(
        DatabaseEntityUniqueConstraintError,
      );
      await expect(result).rejects.toMatchObject({
        status: 409,
        message: 'Время записи уже занято',
      });
      expect(
        await dataSource
          .getRepository(Appointment)
          .countBy({ timeSlotId: winner.timeSlotId! }),
      ).toBe(1);
    });

    it('answers 409 to the reschedule when the free-slot check was already passed', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const taken = await bookFuture(first.id, 3);
      const mover = await bookFuture(second.id, 4, taken.doctorId);
      const realFindOne = appointmentRepo.findOne.bind(appointmentRepo);
      jest
        .spyOn(appointmentRepo, 'findOne')
        .mockImplementationOnce(realFindOne)
        .mockResolvedValueOnce(null);

      const result = service.rescheduleAppointment(
        mover.id,
        second.id,
        taken.timeSlotId!,
      );

      await expect(result).rejects.toBeInstanceOf(
        DatabaseEntityUniqueConstraintError,
      );
      const stored = await dataSource
        .getRepository(Appointment)
        .findOneByOrFail({ id: mover.id });
      expect(stored.timeSlotId).toBe(mover.timeSlotId);
    });

    it('lets exactly one of two parallel creates win, the other gets a 409', async () => {
      const first = await factories.user();
      const second = await factories.user();
      const doctor = await factories.doctor();
      const slot = await factories.timeSlot(doctor.id, { date: '2026-11-03' });
      const dto = { doctorId: doctor.id, timeSlotId: slot.id };

      const results = await Promise.allSettled([
        service.createAppointment(first.id, dto),
        service.createAppointment(second.id, dto),
      ]);

      const rejected = results.filter(r => r.status === 'rejected');
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const reason = rejected[0].reason as unknown;
      expect(
        reason instanceof ConflictException ||
          reason instanceof DatabaseEntityError,
      ).toBe(true);
      expect(
        reason instanceof ConflictException
          ? reason.getStatus()
          : (reason as DatabaseEntityError).status,
      ).toBe(409);
    });
  });

  describe('getAppointmentsForUser', () => {
    // I7
    it('lists only appointments of the requested user', async () => {
      const user = await factories.user();
      const other = await factories.user();
      const own = [await bookFuture(user.id, 3), await bookFuture(user.id, 4)];
      await bookFuture(other.id, 5);

      const { data, count } = await listFuture(user.id);

      expect(data.map(a => a.id)).toEqual(own.map(a => a.id));
      expect(count).toBe(2);
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
      expect(pages.map(p => p.count)).toEqual([5, 5, 5]);
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
      const doctor = await factories.doctor({ medicalCenter, category });
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
            medicalCenter: await factories.medicalCenter({ timezone: MOSCOW }),
          }),
          [BERLIN]: await factories.doctor({
            medicalCenter: await factories.medicalCenter({ timezone: BERLIN }),
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
          medicalCenter: await factories.medicalCenter({ timezone: MOSCOW }),
        });
        const berlin = await factories.doctor({
          medicalCenter: await factories.medicalCenter({ timezone: BERLIN }),
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
