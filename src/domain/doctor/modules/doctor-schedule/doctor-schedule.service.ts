// src/domain/doctor-schedule/doctor-schedule.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DoctorSchedule,
  ScheduleDay,
} from 'src/entities/doctor-schedule.entity';
import { ScheduleRecord } from './dto/doctor-schedule-response.dto';

@Injectable()
export class DoctorScheduleService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly scheduleRepo: Repository<DoctorSchedule>,
  ) {}

  async getScheduleByDoctorId(doctorId: string) {
    const schedules = await this.scheduleRepo.find({
      where: { doctorId },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });

    const result = Object.values(ScheduleDay).reduce<
      Record<ScheduleDay, ScheduleRecord[]>
    >(
      (accumulator, day) => {
        if (typeof day === 'number') accumulator[day] = [];
        return accumulator;
      },
      {} as Record<ScheduleDay, ScheduleRecord[]>,
    );

    for (const s of schedules) {
      result[s.weekday].push({
        start: s.startTime.slice(0, 5),
        end: s.endTime.slice(0, 5),
      });
    }

    return result;
  }
}
