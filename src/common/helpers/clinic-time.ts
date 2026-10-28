import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/** «Сейчас» на часах центра: дата и время в формате колонок `date`/`time`. */
export const getZonedNowParts = (zone: string, now: Date = new Date()) => {
  const [date, time] = dayjs(now)
    .tz(zone)
    .format('YYYY-MM-DD HH:mm:ss')
    .split(' ');

  return { date, time };
};

/** Абсолютный момент начала слота: `date` и `time` заданы в поясе центра. */
export const getSlotStart = (date: string, time: string, zone: string) =>
  dayjs.tz(`${date} ${time}`, zone).toDate();

export const addMinutes = (from: Date, minutes: number) =>
  new Date(from.getTime() + minutes * 60_000);
