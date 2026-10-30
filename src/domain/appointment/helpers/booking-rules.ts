import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { APPOINTMENT_MIN_LEAD_MINUTES } from 'src/common/config';
import { addMinutes, getSlotStart } from 'src/common/helpers/clinic-time';
type Startable = { date: string; startTime: string };

/** Приём должен начинаться не раньше `now + APPOINTMENT_MIN_LEAD_MINUTES` по часам центра. */
export const assertBookingWindow = (
  target: Startable,
  timezone: string,
  message = 'Слишком мало времени до начала приёма',
) => {
  const earliest = addMinutes(new Date(), APPOINTMENT_MIN_LEAD_MINUTES);

  if (getSlotStart(target.date, target.startTime, timezone) < earliest) {
    throw new AppException(ErrorCode.APPOINTMENT_TOO_SOON, { message });
  }
};

/** Слот принадлежит врачу и попадает в окно записи. */
export const assertSlotBookable = (
  slot: Startable & { doctorId: string },
  doctorId: string,
  timezone: string,
) => {
  if (slot.doctorId !== doctorId) {
    throw new AppException(ErrorCode.TIME_SLOT_DOCTOR_MISMATCH);
  }

  assertBookingWindow(slot, timezone);
};
