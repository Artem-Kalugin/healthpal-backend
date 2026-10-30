import { Inject, Injectable } from '@nestjs/common';
import { and, asc, between, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { getZonedNowParts } from 'src/common/helpers/clinic-time';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { toHourMinute } from 'src/common/helpers/to-hour-minute';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import {
  appointment,
  doctor,
  doctorTimeSlot,
  medicalCenter,
} from 'src/db/schema';
import { centerOfDoctor } from '../../doctor.queries';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

@Injectable()
export class DoctorTimeSlotService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getSlotsForDoctor(
    doctorId: string,
    mayBeOverridedStartDate: string,
    endDate: string,
  ) {
    if (mayBeOverridedStartDate > endDate) {
      throw new AppException(ErrorCode.INVALID_DATE_RANGE);
    }

    const now = getZonedNowParts(await this.getDoctorTimezone(doctorId));

    const slots = await this.db
      .select({
        id: doctorTimeSlot.id,
        date: doctorTimeSlot.date,
        startTime: doctorTimeSlot.startTime,
        endTime: doctorTimeSlot.endTime,
      })
      .from(doctorTimeSlot)
      .leftJoin(appointment, eq(appointment.timeSlotId, doctorTimeSlot.id))
      .where(
        and(
          eq(doctorTimeSlot.doctorId, doctorId),
          between(doctorTimeSlot.date, mayBeOverridedStartDate, endDate),
          isNull(appointment.id),
          isUpcoming(now),
        ),
      )
      .orderBy(
        asc(doctorTimeSlot.date),
        asc(doctorTimeSlot.startTime),
        asc(doctorTimeSlot.id),
      );

    const grouped = new Map<string, typeof slots>();

    for (const slot of slots) {
      const day = grouped.get(slot.date) ?? [];
      day.push(slot);
      grouped.set(slot.date, day);
    }

    return [...grouped].map(([date, daySlots]) => ({
      date,
      slots: daySlots.map(s => ({
        startTime: toHourMinute(s.startTime),
        endTime: toHourMinute(s.endTime),
        id: s.id,
      })),
    }));
  }

  /** Диапазон дат, в котором у врача есть свободные будущие слоты (те же правила, что в `getSlotsForDoctor`). */
  async getSlotsRange(doctorId: string) {
    const now = getZonedNowParts(await this.getDoctorTimezone(doctorId));

    const [range] = await this.db
      .select({
        minDate: sql<string | null>`min(${doctorTimeSlot.date})::text`,
        maxDate: sql<string | null>`max(${doctorTimeSlot.date})::text`,
      })
      .from(doctorTimeSlot)
      .leftJoin(appointment, eq(appointment.timeSlotId, doctorTimeSlot.id))
      .where(
        and(
          eq(doctorTimeSlot.doctorId, doctorId),
          isNull(appointment.id),
          isUpcoming(now),
        ),
      );

    if (!range?.minDate || !range?.maxDate) {
      throw new AppException(ErrorCode.NO_AVAILABLE_SLOTS);
    }

    return { minDate: range.minDate, maxDate: range.maxDate };
  }

  private async getDoctorTimezone(doctorId: string) {
    const row = firstOrThrow(
      await this.db
        .select({ timezone: medicalCenter.timezone })
        .from(doctor)
        .innerJoin(medicalCenter, centerOfDoctor)
        .where(eq(doctor.id, doctorId)),
      () => new AppException(ErrorCode.DOCTOR_NOT_FOUND),
    );

    return row.timezone;
  }
}

/** Слот начинается строго позже «сейчас» (дата и время по часам центра). */
const isUpcoming = ({ date, time }: { date: string; time: string }) =>
  or(
    gt(doctorTimeSlot.date, date),
    and(eq(doctorTimeSlot.date, date), gt(doctorTimeSlot.startTime, time)),
  );
