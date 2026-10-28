import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { getZonedNowParts } from 'src/common/helpers/clinic-time';

@Injectable()
export class DoctorTimeSlotService {
  constructor(
    @InjectRepository(DoctorTimeSlot)
    private readonly repo: Repository<DoctorTimeSlot>,
  ) {}

  async getSlotsForDoctor(
    doctorId: string,
    mayBeOverridedStartDate: string,
    endDate: string,
  ) {
    const { date: nowDate, time: nowTime } = getZonedNowParts(
      await this.getDoctorTimezone(doctorId),
    );

    const slots = await this.repo.find({
      where: {
        doctor: { id: doctorId },
        date: Between(mayBeOverridedStartDate, endDate),
      },
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
      relations: ['appointment'],
    });

    const slotsFiltered = slots.filter(slot => {
      if (slot.appointment) return false;
      if (slot.date > nowDate) return true;
      if (slot.date === nowDate && slot.startTime > nowTime) return true;

      return false;
    });

    const grouped: Record<string, DoctorTimeSlot[]> = {};

    for (const slot of slotsFiltered) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }

    return Object.entries(grouped).map(([date, slots]) => ({
      date,
      slots: slots.map(s => ({
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
        id: s.id,
      })),
    }));
  }

  async getSlotsRange(doctorId: string) {
    const minMaxSlot = await this.repo
      .createQueryBuilder('slot')
      .select('MIN(slot.date)::text', 'minDate')
      .addSelect('MAX(slot.date)::text', 'maxDate')
      .where('slot.doctorId = :doctorId', { doctorId })
      .getRawOne<{ minDate: string; maxDate: string }>();

    if (!minMaxSlot?.minDate || !minMaxSlot?.maxDate) {
      throw new NotFoundException('Нет доступного времени записи');
    }

    const { date: nowDate } = getZonedNowParts(
      await this.getDoctorTimezone(doctorId),
    );

    const minDateMaybeOverrided =
      minMaxSlot.minDate < nowDate ? nowDate : minMaxSlot.minDate;

    const res = {
      minDate: minDateMaybeOverrided,
      maxDate: minMaxSlot?.maxDate,
    };

    return res;
  }

  private async getDoctorTimezone(doctorId: string) {
    const row = await this.repo.manager
      .createQueryBuilder()
      .select('center.timezone', 'timezone')
      .from(Doctor, 'doctor')
      .innerJoin('doctor.medicalCenter', 'center')
      .where('doctor.id = :doctorId', { doctorId })
      .getRawOne<{ timezone: string }>();

    if (!row) {
      throw new NotFoundException('Врач не найден');
    }

    return row.timezone;
  }
}
