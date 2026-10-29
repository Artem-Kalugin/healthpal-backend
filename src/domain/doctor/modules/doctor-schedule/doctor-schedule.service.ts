// src/domain/doctor-schedule/doctor-schedule.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DoctorSchedule,
  ScheduleDay,
} from 'src/entities/doctor-schedule.entity';
import { DoctorService } from '../../doctor.service';
import { ScheduleRecord } from './dto/doctor-schedule-response.dto';

@Injectable()
export class DoctorScheduleService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly scheduleRepo: Repository<DoctorSchedule>,
    private readonly doctorService: DoctorService,
  ) {}

  async getScheduleByDoctorId(doctorId: string) {
    if (!(await this.doctorService.existsById(doctorId))) {
      throw new NotFoundException('Врач не найден');
    }

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
