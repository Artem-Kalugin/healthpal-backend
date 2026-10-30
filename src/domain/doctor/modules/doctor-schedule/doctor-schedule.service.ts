import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { toHourMinute } from 'src/common/helpers/to-hour-minute';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { ScheduleDay } from 'src/db/enums';
import { doctorSchedule } from 'src/db/schema';
import { DoctorService } from '../../doctor.service';
import { ScheduleRecord } from './dto/doctor-schedule-response.dto';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

const WEEKDAYS = Object.values(ScheduleDay).filter(
  (day): day is ScheduleDay => typeof day === 'number',
);

@Injectable()
export class DoctorScheduleService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly doctorService: DoctorService,
  ) {}

  async getScheduleByDoctorId(doctorId: string) {
    if (!(await this.doctorService.existsById(doctorId))) {
      throw new AppException(ErrorCode.DOCTOR_NOT_FOUND);
    }

    const schedules = await this.db
      .select({
        weekday: doctorSchedule.weekday,
        startTime: doctorSchedule.startTime,
        endTime: doctorSchedule.endTime,
      })
      .from(doctorSchedule)
      .where(eq(doctorSchedule.doctorId, doctorId))
      .orderBy(
        asc(doctorSchedule.weekday),
        asc(doctorSchedule.startTime),
        asc(doctorSchedule.id),
      );

    const result = Object.fromEntries(
      WEEKDAYS.map(day => [day, [] as ScheduleRecord[]]),
    ) as Record<ScheduleDay, ScheduleRecord[]>;

    for (const s of schedules) {
      result[s.weekday].push({
        start: toHourMinute(s.startTime),
        end: toHourMinute(s.endTime),
      });
    }

    return result;
  }
}
