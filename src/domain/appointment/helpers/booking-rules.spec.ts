import { BadRequestException } from '@nestjs/common';
import { assertBookingWindow, assertSlotBookable } from './booking-rules';

const NOW = new Date('2026-10-29T12:00:00.000Z');

const MOSCOW = 'Europe/Moscow';
const BERLIN = 'Europe/Berlin';
const DOCTOR_ID = 'doctor-1';

// NOW = 15:00:00 в Москве; + APPOINTMENT_MIN_LEAD_MINUTES (2 часа) = 17:00:00
const TOO_SOON = [
  { title: 'started before now', date: '2026-10-29', startTime: '14:59:59' },
  { title: 'starts exactly now', date: '2026-10-29', startTime: '15:00:00' },
  {
    title: 'starts within the lead window',
    date: '2026-10-29',
    startTime: '16:59:59',
  },
  { title: 'is on a previous day', date: '2026-10-28', startTime: '18:00:00' },
];

describe('booking-rules', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('assertBookingWindow', () => {
    it('accepts a start exactly at the end of the lead window', () => {
      expect(() =>
        assertBookingWindow(
          { date: '2026-10-29', startTime: '17:00:00' },
          MOSCOW,
        ),
      ).not.toThrow();
    });

    it.each(TOO_SOON)(
      'throws BadRequest when the start $title',
      ({ date, startTime }) => {
        expect(() => assertBookingWindow({ date, startTime }, MOSCOW)).toThrow(
          BadRequestException,
        );
      },
    );

    // 16:00 по часам центра: в Берлине (UTC+1) это 15:00Z, после границы окна,
    // в Москве (UTC+3) это 13:00Z, до границы.
    it('measures the window in the timezone of the medical center', () => {
      const start = { date: '2026-10-29', startTime: '16:00:00' };

      expect(() => assertBookingWindow(start, BERLIN)).not.toThrow();
      expect(() => assertBookingWindow(start, MOSCOW)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertSlotBookable', () => {
    const slot = (doctorId = DOCTOR_ID) => ({
      doctorId,
      date: '2026-11-03',
      startTime: '11:00:00',
    });

    it('accepts a slot of the doctor inside the window', () => {
      expect(() => assertSlotBookable(slot(), DOCTOR_ID, MOSCOW)).not.toThrow();
    });

    it('throws BadRequest when the slot belongs to another doctor', () => {
      expect(() =>
        assertSlotBookable(slot('doctor-2'), DOCTOR_ID, MOSCOW),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequest when the slot is outside the window', () => {
      expect(() =>
        assertSlotBookable(
          { ...slot(), date: '2026-10-29', startTime: '16:59:59' },
          DOCTOR_ID,
          MOSCOW,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
