import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';

@Injectable()
export class DoctorTimeSlotService {
  constructor(
    @InjectRepository(DoctorTimeSlot)
    private readonly repo: Repository<DoctorTimeSlot>,
  ) {}

  async getSlotsForDoctor(
    doctorId: string,
    startDate: string,
    endDate: string,
  ) {
    const slots = await this.repo.find({
      where: {
        doctor: { id: doctorId },
        date: Between(startDate, endDate),
      },
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
      relations: ['appointment'],
    });

    const grouped: Record<string, DoctorTimeSlot[]> = {};

    const slotsFiltered = slots.filter(element => !element.appointment);

    for (const slot of slotsFiltered) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }

    const resultSlots = Object.entries(grouped).map(([date, slots]) => ({
      date,
      slots: slots.map(s => ({
        startTime: s.startTime.slice(0, 5),
        endTime: s.endTime.slice(0, 5),
        id: s.id,
      })),
    }));

    return resultSlots;
  }

  async getSlotsRange(doctorId: string) {
    const minMaxSlot = await this.repo
      .createQueryBuilder('slot')
      .select('MIN(slot.date)', 'minDate')
      .addSelect('MAX(slot.date)', 'maxDate')
      .where('slot.doctorId = :doctorId', { doctorId })
      .getRawOne<{ minDate: string; maxDate: string }>();

    return {
      minDate: minMaxSlot?.minDate || null,
      maxDate: minMaxSlot?.maxDate || null,
    };
  }
}
