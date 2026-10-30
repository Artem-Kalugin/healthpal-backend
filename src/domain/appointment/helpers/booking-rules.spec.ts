import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { assertBookingWindow, assertSlotBookable } from './booking-rules';

const codeOf = (run: () => void) => {
  try {
    run();
  } catch (error) {
    return (error as AppException).code;
  }
};

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
      'throws AppException when the start $title',
      ({ date, startTime }) => {
        expect(
          codeOf(() => assertBookingWindow({ date, startTime }, MOSCOW)),
        ).toBe(ErrorCode.APPOINTMENT_TOO_SOON);
      },
    );

    // 16:00 по часам центра: в Берлине (UTC+1) это 15:00Z, после границы окна,
    // в Москве (UTC+3) это 13:00Z, до границы.
    it('measures the window in the timezone of the medical center', () => {
      const start = { date: '2026-10-29', startTime: '16:00:00' };

      expect(() => assertBookingWindow(start, BERLIN)).not.toThrow();
      expect(codeOf(() => assertBookingWindow(start, MOSCOW))).toBe(
        ErrorCode.APPOINTMENT_TOO_SOON,
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

    it('throws AppException when the slot belongs to another doctor', () => {
      expect(
        codeOf(() => assertSlotBookable(slot('doctor-2'), DOCTOR_ID, MOSCOW)),
      ).toBe(ErrorCode.TIME_SLOT_DOCTOR_MISMATCH);
    });

    it('throws AppException when the slot is outside the window', () => {
      expect(
        codeOf(() =>
          assertSlotBookable(
            { ...slot(), date: '2026-10-29', startTime: '16:59:59' },
            DOCTOR_ID,
            MOSCOW,
          ),
        ),
      ).toBe(ErrorCode.APPOINTMENT_TOO_SOON);
    });
  });
});
