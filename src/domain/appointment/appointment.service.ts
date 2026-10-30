import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { getSlotStart } from 'src/common/helpers/clinic-time';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { paginate } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import {
  appointment,
  doctor,
  doctorTimeSlot,
  medicalCenter,
} from 'src/db/schema';
import { centerOfDoctor } from 'src/domain/doctor/doctor.queries';
import {
  appointmentStartAt,
  nestDoctor,
  selectAppointments,
} from './appointment.queries';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  AppointmentQueryDto,
  AppointmentType,
} from './dto/appointment-query.dto';
import {
  assertBookingWindow,
  assertSlotBookable,
} from './helpers/booking-rules';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

@Injectable()
export class AppointmentService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getForUser(userId: string, query: AppointmentQueryDto) {
    const { page, size, type } = query;
    const now = sql`${new Date().toISOString()}::timestamptz`;

    const byType = {
      [AppointmentType.CANCELED]: {
        where: eq(appointment.isCancelled, true),
        order: desc(appointmentStartAt),
      },
      [AppointmentType.FUTURE]: {
        where: and(
          eq(appointment.isCancelled, false),
          sql`${appointmentStartAt} > ${now}`,
        ),
        order: asc(appointmentStartAt),
      },
      [AppointmentType.PAST]: {
        where: and(
          eq(appointment.isCancelled, false),
          sql`${appointmentStartAt} <= ${now}`,
        ),
        order: desc(appointmentStartAt),
      },
    }[type];

    const where = and(eq(appointment.userId, userId), byType.where);

    const result = await paginate(
      selectAppointments(this.db)
        .where(where)
        .orderBy(byType.order, asc(appointment.id)),
      { page, size },
    );

    return { ...result, data: result.data.map(nestDoctor) };
  }

  async bookForUser(userId: string, dto: CreateAppointmentDto) {
    const { timeSlotId } = dto;

    const slot = firstOrThrow(
      await this.db
        .select({
          ...getTableColumns(doctorTimeSlot),
          timezone: medicalCenter.timezone,
        })
        .from(doctorTimeSlot)
        .innerJoin(doctor, eq(doctor.id, doctorTimeSlot.doctorId))
        .innerJoin(medicalCenter, centerOfDoctor)
        .where(eq(doctorTimeSlot.id, timeSlotId)),
      () =>
        new AppException(ErrorCode.TIME_SLOT_NOT_FOUND, {
          message: 'Time slot is not available',
        }),
    );

    assertBookingWindow(slot, slot.timezone);

    const [created] = await this.db
      .insert(appointment)
      .values({
        userId,
        doctorId: slot.doctorId,
        timeSlotId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
      .returning({ id: appointment.id });

    return this.findDetailed(created.id);
  }

  async cancelForUser(userId: string, appointmentId: string) {
    const target = await this.findOwned(userId, appointmentId);

    if (target.isCancelled) {
      throw new AppException(ErrorCode.APPOINTMENT_ALREADY_CANCELLED);
    }

    if (
      getSlotStart(target.date, target.startTime, target.timezone) <= new Date()
    ) {
      throw new AppException(ErrorCode.APPOINTMENT_PAST_CANNOT_CANCEL);
    }

    await this.db
      .update(appointment)
      .set({ isCancelled: true, timeSlotId: null })
      .where(eq(appointment.id, appointmentId));

    return this.findDetailed(appointmentId);
  }

  async rescheduleForUser(
    userId: string,
    appointmentId: string,
    newTimeSlotId: string,
  ) {
    const target = await this.findOwned(userId, appointmentId);

    if (target.isCancelled) {
      throw new AppException(ErrorCode.APPOINTMENT_CANCELLED_CANNOT_RESCHEDULE);
    }

    assertBookingWindow(
      target,
      target.timezone,
      'Appointment cannot be rescheduled: too little time before the start',
    );

    const newSlot = firstOrThrow(
      await this.db
        .select()
        .from(doctorTimeSlot)
        .where(eq(doctorTimeSlot.id, newTimeSlotId)),
      () =>
        new AppException(ErrorCode.TIME_SLOT_NOT_FOUND, {
          message: 'New time slot not found',
        }),
    );

    if (newSlot.id === target.timeSlotId) {
      throw new AppException(ErrorCode.APPOINTMENT_SAME_SLOT);
    }

    assertSlotBookable(newSlot, target.doctorId, target.timezone);

    // isCancelled in WHERE: a concurrent cancel must not hand a slot back to a cancelled appointment
    const updated = await this.db
      .update(appointment)
      .set({
        timeSlotId: newSlot.id,
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
      })
      .where(
        and(
          eq(appointment.id, appointmentId),
          eq(appointment.isCancelled, false),
        ),
      )
      .returning({ id: appointment.id });

    if (updated.length === 0) {
      throw new AppException(ErrorCode.APPOINTMENT_CANCELLED_CANNOT_RESCHEDULE);
    }

    return this.findDetailed(appointmentId);
  }

  /** Another user's appointment is reported as not found. */
  private async findOwned(userId: string, appointmentId: string) {
    return firstOrThrow(
      await this.db
        .select({
          ...getTableColumns(appointment),
          timezone: medicalCenter.timezone,
        })
        .from(appointment)
        .innerJoin(doctor, eq(doctor.id, appointment.doctorId))
        .innerJoin(medicalCenter, centerOfDoctor)
        .where(
          and(
            eq(appointment.id, appointmentId),
            eq(appointment.userId, userId),
          ),
        ),
      () => new AppException(ErrorCode.APPOINTMENT_NOT_FOUND),
    );
  }

  private async findDetailed(appointmentId: string) {
    const row = firstOrThrow(
      await selectAppointments(this.db).where(
        eq(appointment.id, appointmentId),
      ),
      () => new AppException(ErrorCode.APPOINTMENT_NOT_FOUND),
    );

    return nestDoctor(row);
  }
}
