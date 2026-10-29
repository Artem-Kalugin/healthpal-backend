import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { ScheduleDay } from 'src/db/enums';
import { doctorSchedule } from 'src/db/schema';
import { DoctorService } from '../../doctor.service';
import { ScheduleRecord } from './dto/doctor-schedule-response.dto';

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
      throw new NotFoundException('Врач не найден');
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
        start: s.startTime.slice(0, 5),
        end: s.endTime.slice(0, 5),
      });
    }

    return result;
  }
}
