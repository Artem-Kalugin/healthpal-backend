import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { appointment, doctorTimeSlot } from 'src/db/schema';

/** The slot starts strictly after "now" (date and time on the center clock). */
const isUpcoming = ({ date, time }: { date: string; time: string }) =>
  or(
    gt(doctorTimeSlot.date, date),
    and(eq(doctorTimeSlot.date, date), gt(doctorTimeSlot.startTime, time)),
  );

/** The doctor's slots with no appointment that start in the future. Requires `appointment` left-joined on `timeSlotId`. */
export const freeUpcomingSlotsOf = (
  doctorId: string,
  now: { date: string; time: string },
) =>
  and(
    eq(doctorTimeSlot.doctorId, doctorId),
    isNull(appointment.id),
    isUpcoming(now),
  );
