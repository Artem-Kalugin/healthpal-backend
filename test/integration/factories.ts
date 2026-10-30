import type { Database } from 'src/db/db.module';
import {
  DoctorCategoryType,
  MedicalCenterType,
  ScheduleDay,
} from 'src/db/enums';
import {
  appointment as appointmentTable,
  doctor as doctorTable,
  doctorCategory,
  doctorSchedule,
  doctorTimeSlot,
  medicalCenter as medicalCenterTable,
  user as userTable,
} from 'src/db/schema';

const IMAGE = { image: 'image.jpg', thumbhash: 'thumbhash' };

let sequence = 0;
const next = () => ++sequence;

type Insert<T extends { $inferInsert: object }> = Partial<T['$inferInsert']>;
type DoctorOverrides = Omit<Insert<typeof doctorTable>, 'rating'> & {
  /** `numeric` is a string in Drizzle, for test convenience we accept a number too. */
  rating?: number | string;
};

export const createFactories = (db: Database) => {
  const insert = async <T>(query: Promise<T[]>) => (await query)[0];

  const medicalCenter = (overrides: Insert<typeof medicalCenterTable> = {}) =>
    insert(
      db
        .insert(medicalCenterTable)
        .values({
          name: `Center ${next()}`,
          address: 'ул. Тверская, д. 1',
          city: 'Москва',
          image: IMAGE,
          lat: 55.75,
          lon: 37.61,
          type: MedicalCenterType.CLINIC,
          timezone: 'Europe/Moscow',
          ...overrides,
        })
        .returning(),
    );

  const category = (overrides: Insert<typeof doctorCategory> = {}) =>
    insert(
      db
        .insert(doctorCategory)
        .values({
          type: DoctorCategoryType.GENERAL,
          icon: 'icon',
          ...overrides,
        })
        .returning(),
    );

  const user = (overrides: Insert<typeof userTable> = {}) =>
    insert(
      db
        .insert(userTable)
        .values({
          name: 'Иван',
          surname: 'Иванов',
          phone: `+7900${String(next()).padStart(7, '0')}`,
          password: 'hash',
          ...overrides,
        })
        .returning(),
    );

  /** Creates `medicalCenterId`/`categoryId` itself if not given. */
  const doctor = async (overrides: DoctorOverrides = {}) =>
    insert(
      db
        .insert(doctorTable)
        .values({
          name: 'Пётр',
          surname: 'Петров',
          practiceStartYear: 2010,
          patientsCount: 100,
          reviewsCount: 10,
          image: IMAGE,
          description: 'Врач',
          medicalCenterId:
            overrides.medicalCenterId ?? (await medicalCenter()).id,
          categoryId: overrides.categoryId ?? (await category()).id,
          ...overrides,
          rating: String(overrides.rating ?? 4.5),
        })
        .returning(),
    );

  const timeSlot = (
    doctorId: string,
    overrides: Insert<typeof doctorTimeSlot> = {},
  ) =>
    insert(
      db
        .insert(doctorTimeSlot)
        .values({
          doctorId,
          date: '2026-11-03',
          startTime: '10:00:00',
          endTime: '10:30:00',
          ...overrides,
        })
        .returning(),
    );

  const schedule = (
    doctorId: string,
    overrides: Insert<typeof doctorSchedule> = {},
  ) =>
    insert(
      db
        .insert(doctorSchedule)
        .values({
          doctorId,
          weekday: ScheduleDay.MONDAY,
          startTime: '09:00:00',
          endTime: '13:00:00',
          ...overrides,
        })
        .returning(),
    );

  /** Appointment for a slot; the time is copied from the slot, like the service does. */
  const appointment = (
    userId: string,
    slot: typeof doctorTimeSlot.$inferSelect,
    overrides: Insert<typeof appointmentTable> = {},
  ) =>
    insert(
      db
        .insert(appointmentTable)
        .values({
          userId,
          doctorId: slot.doctorId,
          timeSlotId: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          ...overrides,
        })
        .returning(),
    );

  return {
    medicalCenter,
    category,
    user,
    doctor,
    timeSlot,
    schedule,
    appointment,
  };
};
