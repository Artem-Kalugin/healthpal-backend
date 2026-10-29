import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor, DoctorRelationKeys } from 'src/entities/doctor.entity';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentQueryDto,
  AppointmentType,
} from './dto/appointment-query.dto';
import { getPaginatedUsingSkipTake } from 'src/common/helpers/pagination/paginate';
import { SortOrder } from 'src/common/config';
import { getSlotStart } from 'src/common/helpers/clinic-time';
import {
  assertBookingWindow,
  assertSlotBookable,
} from './helpers/booking-rules';
import { Appointment } from 'src/entities/appointment.entity';
import { WithDoctorMedicalCenterNameAndAddress } from '../doctor/specification/with-medical-center-name-and-address.specification';
import { WithDoctorCategoryType } from '../doctor/specification/with-category-type.specification';
import { SelectQueryBuilder } from 'typeorm';
import { mapAppointmentWithRaw } from './appointment.mapper';

const ALIAS = 'appointment' as const;
const DOCTOR_ALIAS = 'doctor' as const;
const CENTER_ALIAS = DoctorRelationKeys.MEDICAL_CENTER;
const DOCTOR_CENTER_RELATIONS = ['doctor', 'doctor.medicalCenter'];

// Момент начала записи: колонки date + startTime заданы в поясе центра.
const START_LOCAL = `(${ALIAS}.date + ${ALIAS}.startTime)`;
const NOW_LOCAL = `(CAST(:now AS timestamptz) AT TIME ZONE ${CENTER_ALIAS}.timezone)`;

@Injectable()
export class AppointmentService {
  constructor(
    @Inject(getEntityRepository(Appointment.name))
    private readonly repo: SafeRepository<Appointment>,
    @Inject(getEntityRepository(DoctorTimeSlot.name))
    private readonly timeSlotRepo: SafeRepository<DoctorTimeSlot>,
    @Inject(getEntityRepository(Doctor.name))
    private readonly doctorRepo: SafeRepository<Doctor>,
  ) {}

  async getAppointmentsForUser(userId: string, query: AppointmentQueryDto) {
    const { page, size, type } = query;

    const qb = this.repo
      .createQueryBuilder(ALIAS)
      .leftJoinAndSelect(`${ALIAS}.doctor`, DOCTOR_ALIAS);

    new WithDoctorMedicalCenterNameAndAddress(DOCTOR_ALIAS).apply(
      qb as unknown as SelectQueryBuilder<Doctor>,
    );
    new WithDoctorCategoryType(DOCTOR_ALIAS).apply(
      qb as unknown as SelectQueryBuilder<Doctor>,
    );

    qb.where(`${ALIAS}.userId = :userId`, { userId });

    const now = new Date();

    switch (type) {
      case AppointmentType.CANCELED:
        qb.andWhere(`${ALIAS}.isCancelled = true`);
        qb.orderBy(`${ALIAS}.date`, SortOrder.DESC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.DESC);
        break;

      case AppointmentType.FUTURE:
        qb.andWhere(`${ALIAS}.isCancelled = false`);
        qb.andWhere(`${START_LOCAL} > ${NOW_LOCAL}`, { now });
        qb.orderBy(`${ALIAS}.date`, SortOrder.ASC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.ASC);
        break;

      case AppointmentType.PAST:
        qb.andWhere(`${ALIAS}.isCancelled = false`);
        qb.andWhere(`${START_LOCAL} <= ${NOW_LOCAL}`, { now });
        qb.orderBy(`${ALIAS}.date`, SortOrder.DESC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.DESC);
        break;

      default:
        qb.orderBy(`${ALIAS}.date`, SortOrder.ASC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.ASC);
        break;
    }

    const res = await getPaginatedUsingSkipTake(qb, page, size);

    return { ...res, data: mapAppointmentWithRaw(res.data) };
  }
  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const { doctorId, timeSlotId } = dto;

    const doctor = await this.doctorRepo.findOneBy({ id: doctorId });

    if (!doctor) {
      throw new NotFoundException('Врач не найден');
    }

    const timeSlot = await this.timeSlotRepo.findOne({
      where: {
        id: timeSlotId,
      },
      relations: DOCTOR_CENTER_RELATIONS,
    });

    if (!timeSlot) {
      throw new NotFoundException('Тайм слот недоступен');
    }

    assertSlotBookable(
      timeSlot,
      doctorId,
      timeSlot.doctor.medicalCenter.timezone,
    );
    await this.assertSlotFree(timeSlotId);

    const entity = this.repo.create({
      user: { id: userId },
      doctor: { id: doctorId },
      timeSlot: { id: timeSlotId },
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
    });

    return this.repo.safeSave(entity);
  }

  async cancelAppointment(appointmentId: string, userId: string) {
    const appointment = await this.repo.findOne({
      where: {
        id: appointmentId,
        user: { id: userId },
      },
      relations: DOCTOR_CENTER_RELATIONS,
    });

    if (!appointment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (appointment.isCancelled) {
      throw new BadRequestException('Запись уже отменена');
    }

    const { timezone } = appointment.doctor.medicalCenter;

    if (
      getSlotStart(appointment.date, appointment.startTime, timezone) <=
      new Date()
    ) {
      throw new BadRequestException('Прошедшую запись нельзя отменить');
    }

    await this.repo.update(
      { id: appointmentId },
      {
        isCancelled: true,
        timeSlotId: null,
      },
    );

    return { ...appointment, isCancelled: true, timeSlotId: null };
  }

  async rescheduleAppointment(
    appointmentId: string,
    userId: string,
    newTimeSlotId: string,
  ) {
    const appointment = await this.repo.findOne({
      where: { id: appointmentId, user: { id: userId } },
      relations: [...DOCTOR_CENTER_RELATIONS, 'timeSlot'],
    });

    if (!appointment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (appointment.isCancelled) {
      throw new BadRequestException('Отменённую запись нельзя перенести');
    }

    const { timezone } = appointment.doctor.medicalCenter;

    assertBookingWindow(
      appointment,
      timezone,
      'Запись нельзя перенести: слишком мало времени до начала приёма',
    );

    const newSlot = await this.timeSlotRepo.findOne({
      where: { id: newTimeSlotId },
      relations: ['doctor'],
    });

    if (!newSlot) {
      throw new NotFoundException('Новый тайм слот не найден');
    }

    if (newSlot.id === appointment.timeSlotId) {
      throw new BadRequestException('Запись уже назначена на это время');
    }

    assertSlotBookable(newSlot, appointment.doctorId, timezone);
    await this.assertSlotFree(newTimeSlotId);

    appointment.timeSlot = newSlot;
    appointment.timeSlotId = newSlot.id;
    appointment.date = newSlot.date;
    appointment.startTime = newSlot.startTime;
    appointment.endTime = newSlot.endTime;

    return this.repo.safeSave(appointment);
  }

  private async assertSlotFree(timeSlotId: string) {
    const existing = await this.repo.findOne({
      where: { timeSlotId, isCancelled: false },
    });

    if (existing) {
      throw new ConflictException('Время записи уже занято');
    }
  }
}
