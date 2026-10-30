import { Locale, type Localized } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import type { Database } from 'src/db/db.module';
import {
  DoctorCategoryType,
  MedicalCenterType,
  Region,
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

/** Default request context: the Russian client without headers. */
export const CTX: RequestContext = { locale: Locale.RU, region: Region.RU };

/** For test convenience a translatable field accepts a plain string: the same text in every locale. */
type LocalizedInput = string | Localized;
const toLocalized = (value: LocalizedInput): Localized =>
  typeof value === 'string' ? { ru: value, en: value } : value;

type WithLocalized<T, Keys extends keyof T> = Omit<T, Keys> & {
  [K in Keys]?: LocalizedInput;
};

type Insert<T extends { $inferInsert: object }> = Partial<T['$inferInsert']>;
type CenterOverrides = WithLocalized<
  Insert<typeof medicalCenterTable>,
  'name' | 'address' | 'city'
>;
type DoctorOverrides = Omit<
  WithLocalized<Insert<typeof doctorTable>, 'name' | 'surname' | 'description'>,
  'rating'
> & {
  /** `numeric` is a string in Drizzle, for test convenience we accept a number too. */
  rating?: number | string;
};

export const createFactories = (db: Database) => {
  const insert = async <T>(query: Promise<T[]>) => (await query)[0];

  const medicalCenter = ({
    name = `Center ${next()}`,
    address = '1 Main Street',
    city = 'Moscow',
    ...overrides
  }: CenterOverrides = {}) =>
    insert(
      db
        .insert(medicalCenterTable)
        .values({
          name: toLocalized(name),
          address: toLocalized(address),
          city: toLocalized(city),
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
          name: 'Ivan',
          surname: 'Ivanov',
          phone: `+7900${String(next()).padStart(7, '0')}`,
          password: 'hash',
          ...overrides,
        })
        .returning(),
    );

  /** Creates `medicalCenterId`/`categoryId` itself if not given. */
  const doctor = async ({
    name = 'Peter',
    surname = 'Petrov',
    description = 'Doctor',
    ...overrides
  }: DoctorOverrides = {}) =>
    insert(
      db
        .insert(doctorTable)
        .values({
          name: toLocalized(name),
          surname: toLocalized(surname),
          description: toLocalized(description),
          practiceStartYear: 2010,
          patientsCount: 100,
          reviewsCount: 10,
          image: IMAGE,
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
