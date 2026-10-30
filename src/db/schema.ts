import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { Constraint } from './constraints';
import {
  DoctorCategoryType,
  Gender,
  MedicalCenterType,
  ScheduleDay,
} from './enums';

const enumValues = <T extends string>(enumObject: Record<string, T>) =>
  Object.values(enumObject) as [T, ...T[]];

export const doctorCategoryType = pgEnum(
  'doctor_category_type',
  enumValues(DoctorCategoryType),
);

export const medicalCenterType = pgEnum(
  'medical_center_type',
  enumValues(MedicalCenterType),
);

export const gender = pgEnum('gender', enumValues(Gender));

export type StoredImage = { image: string; thumbhash: string };

export const doctorCategory = pgTable('doctor_category', {
  id: uuid().primaryKey().defaultRandom(),
  type: doctorCategoryType().$type<DoctorCategoryType>().notNull(),
  order: integer().notNull().default(0),
  icon: text().notNull(),
});

export const medicalCenter = pgTable('medical_center', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),
  address: varchar().notNull(),
  city: varchar().notNull(),
  image: jsonb().$type<StoredImage>().notNull(),
  lat: doublePrecision().notNull(),
  lon: doublePrecision().notNull(),
  /** IANA time zone name (`Europe/Moscow`): the center slot `date`/`startTime` are given in it. */
  timezone: varchar().notNull().default('Europe/Moscow'),
  type: medicalCenterType()
    .$type<MedicalCenterType>()
    .notNull()
    .default(MedicalCenterType.CLINIC),
});

export const doctor = pgTable(
  'doctor',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    surname: varchar({ length: 255 }).notNull(),
    practiceStartYear: integer().notNull(),
    patientsCount: integer().notNull(),
    reviewsCount: integer().notNull(),
    image: jsonb().$type<StoredImage>().notNull(),
    rating: numeric({ precision: 2, scale: 1 }).notNull(),
    description: varchar({ length: 1000 }).notNull(),
    categoryId: uuid().notNull(),
    medicalCenterId: uuid().notNull(),
  },
  t => [
    foreignKey({
      name: Constraint.DOCTOR_CATEGORY_FK,
      columns: [t.categoryId],
      foreignColumns: [doctorCategory.id],
    }),
    foreignKey({
      name: Constraint.DOCTOR_MEDICAL_CENTER_FK,
      columns: [t.medicalCenterId],
      foreignColumns: [medicalCenter.id],
    }),
    index('doctor_medical_center_idx').on(t.medicalCenterId),
  ],
);

export const user = pgTable(
  'user',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar().notNull(),
    surname: varchar().notNull(),
    phone: varchar().notNull(),
    password: varchar().notNull(),
    nickname: varchar(),
    birthday: timestamp({ mode: 'date' }),
    gender: gender().$type<Gender>(),
    avatar: jsonb().$type<StoredImage>(),
    registrationComplete: boolean(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  t => [
    unique(Constraint.USER_PHONE_UNIQUE).on(t.phone),
    unique(Constraint.USER_NICKNAME_UNIQUE).on(t.nickname),
    check(Constraint.USER_PHONE_FORMAT_CHECK, sql`${t.phone} ~ '^\\+\\d{11}$'`),
    check(
      Constraint.USER_BIRTHDAY_PAST_CHECK,
      sql`${t.birthday} <= CURRENT_DATE`,
    ),
  ],
);

export const doctorSchedule = pgTable(
  'doctor_schedule',
  {
    id: uuid().primaryKey().defaultRandom(),
    doctorId: uuid().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
    /** ISO weekday: 1 = Monday ... 7 = Sunday. */
    weekday: smallint().$type<ScheduleDay>().notNull(),
  },
  t => [
    foreignKey({
      name: Constraint.DOCTOR_SCHEDULE_DOCTOR_FK,
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
    check(
      Constraint.DOCTOR_SCHEDULE_WEEKDAY_CHECK,
      sql`${t.weekday} BETWEEN 1 AND 7`,
    ),
    index('doctor_schedule_doctor_idx').on(t.doctorId),
  ],
);

export const doctorTimeSlot = pgTable(
  'doctor_time_slot',
  {
    id: uuid().primaryKey().defaultRandom(),
    doctorId: uuid().notNull(),
    date: date({ mode: 'string' }).notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  t => [
    foreignKey({
      name: Constraint.DOCTOR_TIME_SLOT_DOCTOR_FK,
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
    index('doctor_time_slot_doctor_date_idx').on(
      t.doctorId,
      t.date,
      t.startTime,
    ),
  ],
);

export const appointment = pgTable(
  'appointment',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().notNull(),
    doctorId: uuid().notNull(),
    timeSlotId: uuid(),
    isCancelled: boolean().notNull().default(false),
    date: date({ mode: 'string' }).notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  t => [
    foreignKey({
      name: Constraint.APPOINTMENT_USER_FK,
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: Constraint.APPOINTMENT_DOCTOR_FK,
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
    foreignKey({
      name: Constraint.APPOINTMENT_TIME_SLOT_FK,
      columns: [t.timeSlotId],
      foreignColumns: [doctorTimeSlot.id],
    }).onDelete('set null'),
    // Cancelling frees the slot (`timeSlotId = null`), so slot occupancy relies entirely on this unique
    unique(Constraint.APPOINTMENT_TIME_SLOT_UNIQUE).on(t.timeSlotId),
    index('appointment_user_idx').on(t.userId),
  ],
);

export const onboardingSlide = pgTable('onboarding_slide', {
  id: uuid().primaryKey().defaultRandom(),
  image: jsonb().$type<StoredImage>().notNull(),
  title: varchar({ length: 128 }).notNull(),
  text: text().notNull(),
  order: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const userFavoriteDoctor = pgTable(
  'user_favorite_doctor',
  {
    userId: uuid().notNull(),
    doctorId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    primaryKey({
      name: Constraint.USER_FAVORITE_DOCTOR_PK,
      columns: [t.userId, t.doctorId],
    }),
    foreignKey({
      name: Constraint.USER_FAVORITE_DOCTOR_USER_FK,
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: Constraint.USER_FAVORITE_DOCTOR_DOCTOR_FK,
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
  ],
);

export const userFavoriteMedicalCenter = pgTable(
  'user_favorite_medical_center',
  {
    userId: uuid().notNull(),
    medicalCenterId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    primaryKey({
      name: Constraint.USER_FAVORITE_MEDICAL_CENTER_PK,
      columns: [t.userId, t.medicalCenterId],
    }),
    foreignKey({
      name: Constraint.USER_FAVORITE_MEDICAL_CENTER_USER_FK,
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: Constraint.USER_FAVORITE_MEDICAL_CENTER_CENTER_FK,
      columns: [t.medicalCenterId],
      foreignColumns: [medicalCenter.id],
    }).onDelete('cascade'),
  ],
);

export type User = typeof user.$inferSelect;
