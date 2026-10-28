import { BadRequestException } from '@nestjs/common';
import { APPOINTMENT_MIN_LEAD_MINUTES } from 'src/common/config';
import { addMinutes, getSlotStart } from 'src/common/helpers/clinic-time';
import type { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';

type Startable = Pick<DoctorTimeSlot, 'date' | 'startTime'>;

/** Приём должен начинаться не раньше `now + APPOINTMENT_MIN_LEAD_MINUTES` по часам центра. */
export const assertBookingWindow = (
  target: Startable,
  timezone: string,
  message = 'Слишком мало времени до начала приёма',
) => {
  const earliest = addMinutes(new Date(), APPOINTMENT_MIN_LEAD_MINUTES);

  if (getSlotStart(target.date, target.startTime, timezone) < earliest) {
    throw new BadRequestException(message);
  }
};

/** Слот принадлежит врачу и попадает в окно записи. */
export const assertSlotBookable = (
  slot: Startable & { doctor: { id: string } },
  doctorId: string,
  timezone: string,
) => {
  if (slot.doctor.id !== doctorId) {
    throw new BadRequestException('Тайм слот не принадлежит этому врачу');
  }

  assertBookingWindow(slot, timezone);
};
