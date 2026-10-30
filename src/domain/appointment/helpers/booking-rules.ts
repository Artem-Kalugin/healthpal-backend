import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { addMinutes, getSlotStart } from 'src/common/helpers/clinic-time';
type Startable = { date: string; startTime: string };

const APPOINTMENT_MIN_LEAD_MINUTES = 120;

/** The start must be no earlier than `now + APPOINTMENT_MIN_LEAD_MINUTES` on the center's clock. */
export const assertBookingWindow = (
  target: Startable,
  timezone: string,
  message = 'Too little time before the start',
) => {
  const earliest = addMinutes(new Date(), APPOINTMENT_MIN_LEAD_MINUTES);

  if (getSlotStart(target.date, target.startTime, timezone) < earliest) {
    throw new AppException(ErrorCode.APPOINTMENT_TOO_SOON, { message });
  }
};

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
