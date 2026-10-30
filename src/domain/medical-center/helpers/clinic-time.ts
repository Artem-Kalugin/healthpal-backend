import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/** "Now" on the center clock: date and time in the format of the `date`/`time` columns. */
export const getZonedNowParts = (zone: string, now: Date = new Date()) => {
  const [date, time] = dayjs(now)
    .tz(zone)
    .format('YYYY-MM-DD HH:mm:ss')
    .split(' ');

  return { date, time };
};

/** Absolute start moment of a slot: `date` and `time` are given in the center time zone. */
export const getSlotStart = (date: string, time: string, zone: string) =>
  dayjs.tz(`${date} ${time}`, zone).toDate();

export const addMinutes = (from: Date, minutes: number) =>
  new Date(from.getTime() + minutes * 60_000);
