import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentQueryDto,
  AppointmentType,
} from './dto/appointment-query.dto';
import { getPaginatedUsingSkipTake } from 'src/common/helpers/pagination/paginate';
import { SortOrder } from 'src/common/config';
import { Appointment } from 'src/entities/appointment';
import { WithDoctorMedicalCenterNameAndAdress } from '../doctor/specification/with-medical-center-name-and-adress.specification';
import { WithDoctorCategoryType } from '../doctor/specification/with-category-type.specification';
import { SelectQueryBuilder } from 'typeorm';
import { mapAppointmentWithRaw } from './appointment.mapper';

const ALIAS = 'appointment' as const;
const DOCTOR_ALIAS = 'doctor' as const;

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

    new WithDoctorMedicalCenterNameAndAdress(DOCTOR_ALIAS).apply(
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
        qb.andWhere(
          `${ALIAS}.date > :now OR (${ALIAS}.date = :now AND ${ALIAS}.startTime > :nowTime)`,
          {
            now: now.toISOString().split('T')[0],
            nowTime: now.toTimeString().split(' ')[0],
          },
        );
        qb.orderBy(`${ALIAS}.date`, SortOrder.ASC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.ASC);
        break;

      case AppointmentType.PAST:
        qb.andWhere(`${ALIAS}.isCancelled = false`);
        qb.andWhere(
          `${ALIAS}.date < :now OR (${ALIAS}.date = :now AND ${ALIAS}.startTime <= :nowTime)`,
          {
            now: now.toISOString().split('T')[0],
            nowTime: now.toTimeString().split(' ')[0],
          },
        );
        qb.orderBy(`${ALIAS}.date`, SortOrder.DESC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.DESC);
        break;

      default:
        qb.orderBy(`${ALIAS}.date`, SortOrder.ASC);
        qb.addOrderBy(`${ALIAS}.startTime`, SortOrder.ASC);
        break;
    }

    const res = await getPaginatedUsingSkipTake(qb, page, size);

    console.log(res, userId);
    return { ...res, data: mapAppointmentWithRaw(res.data) };
  }
  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const { doctorId, timeSlotId } = dto;

    await this.doctorRepo.findOneByOrFail({ id: doctorId });
    const timeSlot = await this.timeSlotRepo.findOne({
      where: {
        id: timeSlotId,
      },
      relations: ['doctor'],
    });

    if (!timeSlot) {
      throw new NotFoundException('Тайм слот недоступен');
    }

    if (timeSlot.doctor.id !== doctorId) {
      throw new BadRequestException('Времененной слот не соответствует врачу');
    }

    const existing = await this.repo.findOne({
      where: {
        timeSlotId,
        isCancelled: false,
      },
    });

    if (existing) {
      throw new BadRequestException('Время записи уже занято');
    }

    const entity = this.repo.create({
      user: { id: userId },
      doctor: { id: doctorId },
      timeSlot: { id: timeSlotId },
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
    });

    return this.repo.save(entity);
  }

  async cancelAppointment(appointmentId: string, userId: string) {
    const appointment = await this.repo.findOneOrFail({
      where: {
        id: appointmentId,
        user: { id: userId },
      },
    });

    if (appointment.userId !== userId) {
      throw new BadRequestException('Вы не можете управлять данной записью');
    }

    if (appointment.timeSlotId === null) {
      throw new BadRequestException('Запись уже отменена');
    }

    await this.repo.update(
      { id: appointmentId },
      {
        isCancelled: true,
        timeSlotId: null,
      },
    );

    return { success: true };
  }

  async rescheduleAppointment(
    appointmentId: string,
    userId: string,
    newTimeSlotId: string,
  ) {
    const appointment = await this.repo.findOne({
      where: { id: appointmentId },
      relations: ['doctor', 'timeSlot'],
    });

    if (!appointment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (appointment.userId !== userId) {
      throw new BadRequestException('Вы не можете управлять этой записью');
    }

    if (appointment.isCancelled) {
      throw new BadRequestException('Отменённую запись нельзя перенести');
    }

    const newSlot = await this.timeSlotRepo.findOne({
      where: { id: newTimeSlotId },
      relations: ['doctor'],
    });

    if (!newSlot) {
      throw new NotFoundException('Новый тайм слот не найден');
    }

    if (newSlot.doctor.id !== appointment.doctorId) {
      throw new BadRequestException(
        'Новый тайм слот не принадлежит врачу текущей записи',
      );
    }

    const existing = await this.repo.findOne({
      where: { timeSlotId: newTimeSlotId, isCancelled: false },
    });

    if (existing) {
      throw new BadRequestException('Выбранное время уже занято');
    }

    appointment.timeSlot = newSlot;
    appointment.timeSlotId = newSlot.id;
    appointment.date = newSlot.date;
    appointment.startTime = newSlot.startTime;
    appointment.endTime = newSlot.endTime;

    return this.repo.save(appointment);
  }
}
