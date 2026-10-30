import { Inject, Injectable } from '@nestjs/common';
import { and, asc, between, eq, sql } from 'drizzle-orm';
import { getZonedNowParts } from 'src/domain/medical-center/helpers/clinic-time';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { toHourMinute } from 'src/domain/doctor/helpers/to-hour-minute';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import {
  appointment,
  doctor,
  doctorTimeSlot,
  medicalCenter,
} from 'src/db/schema';
import { centerOfDoctor } from 'src/domain/doctor/doctor.queries';
import { freeUpcomingSlotsOf } from './doctor-time-slot.queries';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

@Injectable()
export class DoctorTimeSlotService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getAvailable(doctorId: string, startDate: string, endDate: string) {
    if (startDate > endDate) {
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
          freeUpcomingSlotsOf(doctorId, now),
          between(doctorTimeSlot.date, startDate, endDate),
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

  /** Date range in which the doctor has free future slots (same rules as in `getAvailable`). */
  async getAvailableRange(doctorId: string) {
    const now = getZonedNowParts(await this.getDoctorTimezone(doctorId));

    const [range] = await this.db
      .select({
        minDate: sql<string | null>`min(${doctorTimeSlot.date})::text`,
        maxDate: sql<string | null>`max(${doctorTimeSlot.date})::text`,
      })
      .from(doctorTimeSlot)
      .leftJoin(appointment, eq(appointment.timeSlotId, doctorTimeSlot.id))
      .where(freeUpcomingSlotsOf(doctorId, now));

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
