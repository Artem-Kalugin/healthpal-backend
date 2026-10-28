import { addMinutes, getSlotStart, getZonedNowParts } from './clinic-time';

describe('clinic-time', () => {
  describe('getZonedNowParts', () => {
    const now = new Date('2026-10-29T22:30:15.123Z');

    it.each([
      { zone: 'UTC', date: '2026-10-29', time: '22:30:15' },
      { zone: 'Europe/Moscow', date: '2026-10-30', time: '01:30:15' },
      { zone: 'Europe/Berlin', date: '2026-10-29', time: '23:30:15' },
    ])(
      'returns date and time on the wall clock in $zone',
      ({ zone, ...parts }) => {
        expect(getZonedNowParts(zone, now)).toEqual(parts);
      },
    );
  });

  describe('getSlotStart', () => {
    it.each([
      { zone: 'Europe/Moscow', expected: '2026-11-03T08:00:00.000Z' },
      { zone: 'Europe/Berlin', expected: '2026-11-03T10:00:00.000Z' },
      { zone: 'UTC', expected: '2026-11-03T11:00:00.000Z' },
    ])(
      'reads date and time as wall-clock time in $zone',
      ({ zone, expected }) => {
        expect(getSlotStart('2026-11-03', '11:00:00', zone).toISOString()).toBe(
          expected,
        );
      },
    );

    it('follows daylight saving of the zone', () => {
      expect(
        getSlotStart('2026-07-01', '11:00:00', 'Europe/Berlin').toISOString(),
      ).toBe('2026-07-01T09:00:00.000Z');
      expect(
        getSlotStart('2026-12-01', '11:00:00', 'Europe/Berlin').toISOString(),
      ).toBe('2026-12-01T10:00:00.000Z');
    });

    it.each(['UTC', 'Pacific/Auckland', 'America/Los_Angeles'])(
      'does not depend on the process timezone (%s)',
      zone => {
        const previous = process.env.TZ;
        process.env.TZ = zone;
        try {
          expect(
            getSlotStart(
              '2026-11-03',
              '11:00:00',
              'Europe/Moscow',
            ).toISOString(),
          ).toBe('2026-11-03T08:00:00.000Z');
        } finally {
          process.env.TZ = previous;
        }
      },
    );
  });

  describe('addMinutes', () => {
    it('shifts the instant forward without mutating the source', () => {
      const from = new Date('2026-10-29T12:00:00.000Z');

      expect(addMinutes(from, 120).toISOString()).toBe(
        '2026-10-29T14:00:00.000Z',
      );
      expect(from.toISOString()).toBe('2026-10-29T12:00:00.000Z');
    });
  });
});
