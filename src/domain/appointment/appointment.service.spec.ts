import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { Appointment } from 'src/entities/appointment.entity';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { AppointmentService } from './appointment.service';

const NOW = new Date('2026-10-29T12:00:00.000Z');

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const DOCTOR_ID = 'doctor-1';

const MOSCOW = 'Europe/Moscow';
const BERLIN = 'Europe/Berlin';

const makeDoctor = (timezone = MOSCOW, id = DOCTOR_ID) =>
  ({ id, medicalCenter: { timezone } }) as Doctor;

const makeSlot = (overrides: Partial<DoctorTimeSlot> = {}) =>
  ({
    id: 'slot-2',
    doctorId: DOCTOR_ID,
    doctor: makeDoctor(),
    date: '2026-11-03',
    startTime: '11:00:00',
    endTime: '11:30:00',
    ...overrides,
  }) as DoctorTimeSlot;

const makeAppointment = (overrides: Partial<Appointment> = {}) =>
  ({
    id: 'appointment-1',
    userId: USER_ID,
    doctorId: DOCTOR_ID,
    doctor: makeDoctor(),
    timeSlotId: 'slot-1',
    isCancelled: false,
    date: '2026-11-02',
    startTime: '10:00:00',
    endTime: '10:30:00',
    ...overrides,
  }) as Appointment;

const createRepoMock = () => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn((entity: unknown) => entity),
  safeSave: jest.fn(),
  update: jest.fn(),
});

type RepoMock = ReturnType<typeof createRepoMock>;

describe('AppointmentService', () => {
  let repo: RepoMock;
  let slotRepo: RepoMock;
  let doctorRepo: RepoMock;
  let service: AppointmentService;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });

    repo = createRepoMock();
    slotRepo = createRepoMock();
    doctorRepo = createRepoMock();

    service = new AppointmentService(
      repo as unknown as SafeRepository<Appointment>,
      slotRepo as unknown as SafeRepository<DoctorTimeSlot>,
      doctorRepo as unknown as SafeRepository<Doctor>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const givenDoctorExists = () => {
    doctorRepo.findOneBy.mockResolvedValue({ id: DOCTOR_ID });
  };

  const givenNoDoctor = () => {
    doctorRepo.findOneBy.mockResolvedValue(null);
  };

  const givenCancelTarget = (appointment: Appointment | null) => {
    repo.findOne.mockResolvedValue(appointment);
  };

  describe('createAppointment', () => {
    const dto = { doctorId: DOCTOR_ID, timeSlotId: 'slot-2' };

    beforeEach(() => {
      givenDoctorExists();
      slotRepo.findOne.mockResolvedValue(makeSlot());
      repo.findOne.mockResolvedValue(null);
    });

    it('saves the appointment for the user with the time copied from the slot', async () => {
      const saved = makeAppointment();
      repo.safeSave.mockResolvedValue(saved);

      const result = await service.createAppointment(USER_ID, dto);

      expect(repo.safeSave).toHaveBeenCalledWith({
        user: { id: USER_ID },
        doctor: { id: DOCTOR_ID },
        timeSlot: { id: 'slot-2' },
        date: '2026-11-03',
        startTime: '11:00:00',
        endTime: '11:30:00',
      });
      expect(result).toBe(saved);
    });

    it('throws NotFound when the time slot does not exist', async () => {
      slotRepo.findOne.mockResolvedValue(null);

      await expect(service.createAppointment(USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws Conflict when the slot is already taken', async () => {
      repo.findOne.mockResolvedValue(
        makeAppointment({ userId: OTHER_USER_ID }),
      );

      await expect(service.createAppointment(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws NotFound when the doctor does not exist', async () => {
      givenNoDoctor();

      await expect(service.createAppointment(USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('applies the booking rules to the slot', async () => {
      slotRepo.findOne.mockResolvedValue(
        makeSlot({ date: '2026-10-29', startTime: '16:59:59' }),
      );

      await expect(service.createAppointment(USER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.safeSave).not.toHaveBeenCalled();
    });
  });

  describe('cancelAppointment', () => {
    it('marks the appointment cancelled and releases its slot', async () => {
      givenCancelTarget(makeAppointment());

      const result = await service.cancelAppointment('appointment-1', USER_ID);

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'appointment-1' },
        { isCancelled: true, timeSlotId: null },
      );
      expect(result).toMatchObject({
        id: 'appointment-1',
        isCancelled: true,
        timeSlotId: null,
      });
    });

    it('throws BadRequest when the appointment is already cancelled', async () => {
      givenCancelTarget(
        makeAppointment({ isCancelled: true, timeSlotId: null }),
      );

      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('cancels an active appointment whose slot was removed', async () => {
      givenCancelTarget(makeAppointment({ timeSlotId: null }));

      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).resolves.toMatchObject({ isCancelled: true, timeSlotId: null });
      expect(repo.update).toHaveBeenCalledWith(
        { id: 'appointment-1' },
        { isCancelled: true, timeSlotId: null },
      );
    });

    it('throws NotFound when the appointment is not found', async () => {
      givenCancelTarget(null);

      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('judges whether the appointment started by the timezone of its medical center', async () => {
      // 14:30 по часам центра: в Берлине (13:30Z) ещё впереди, в Москве (11:30Z) уже началось
      const startsAt = { date: '2026-10-29', startTime: '14:30:00' };

      givenCancelTarget(
        makeAppointment({ ...startsAt, doctor: makeDoctor(BERLIN) }),
      );
      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).resolves.toMatchObject({ isCancelled: true, timeSlotId: null });

      givenCancelTarget(
        makeAppointment({ ...startsAt, doctor: makeDoctor(MOSCOW) }),
      );
      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequest when the appointment is in the past', async () => {
      givenCancelTarget(
        makeAppointment({ date: '2026-10-29', startTime: '14:00:00' }),
      );

      await expect(
        service.cancelAppointment('appointment-1', USER_ID),
      ).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('rescheduleAppointment', () => {
    const givenAppointment = (appointment: Appointment | null) => {
      repo.findOne.mockResolvedValueOnce(appointment);
    };
    const givenSlotTaken = (by: Appointment | null) => {
      repo.findOne.mockResolvedValueOnce(by);
    };

    beforeEach(() => {
      slotRepo.findOne.mockResolvedValue(makeSlot());
    });

    it('moves the appointment to the new slot and refreshes the time', async () => {
      const appointment = makeAppointment();
      const saved = makeAppointment({ timeSlotId: 'slot-2' });
      givenAppointment(appointment);
      givenSlotTaken(null);
      repo.safeSave.mockResolvedValue(saved);

      const result = await service.rescheduleAppointment(
        'appointment-1',
        USER_ID,
        'slot-2',
      );

      expect(repo.safeSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appointment-1',
          isCancelled: false,
          timeSlotId: 'slot-2',
          date: '2026-11-03',
          startTime: '11:00:00',
          endTime: '11:30:00',
        }),
      );
      expect(result).toBe(saved);
    });

    it('throws NotFound when the appointment does not exist', async () => {
      givenAppointment(null);

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(NotFoundException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the appointment is cancelled', async () => {
      givenAppointment(makeAppointment({ isCancelled: true }));

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the current appointment is inside the booking window', async () => {
      givenAppointment(
        makeAppointment({ date: '2026-10-29', startTime: '16:59:59' }),
      );

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws NotFound when the new slot does not exist', async () => {
      givenAppointment(makeAppointment());
      slotRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(NotFoundException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws Conflict when the new slot is taken', async () => {
      givenAppointment(makeAppointment());
      givenSlotTaken(
        makeAppointment({
          id: 'appointment-2',
          userId: OTHER_USER_ID,
          timeSlotId: 'slot-2',
        }),
      );

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(ConflictException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('throws BadRequest, not Conflict, when moving to the current slot', async () => {
      const appointment = makeAppointment({ timeSlotId: 'slot-2' });
      givenAppointment(appointment);
      givenSlotTaken(appointment);

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });

    it('applies the booking rules to the new slot', async () => {
      givenAppointment(makeAppointment());
      slotRepo.findOne.mockResolvedValue(
        makeSlot({ date: '2026-10-29', startTime: '16:59:59' }),
      );

      await expect(
        service.rescheduleAppointment('appointment-1', USER_ID, 'slot-2'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.safeSave).not.toHaveBeenCalled();
    });
  });
});
