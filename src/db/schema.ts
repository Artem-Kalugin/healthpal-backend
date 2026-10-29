import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
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
  /** IANA-имя пояса (`Europe/Moscow`): в нём заданы `date`/`startTime` слотов центра. */
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
      name: 'doctor_category_fk',
      columns: [t.categoryId],
      foreignColumns: [doctorCategory.id],
    }),
    foreignKey({
      name: 'doctor_medical_center_fk',
      columns: [t.medicalCenterId],
      foreignColumns: [medicalCenter.id],
    }),
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
    unique('user_phone_unique').on(t.phone),
    unique('user_nickname_unique').on(t.nickname),
    check('user_phone_format_check', sql`${t.phone} ~ '^\\+\\d{11}$'`),
    check('user_birthday_past_check', sql`${t.birthday} <= CURRENT_DATE`),
  ],
);

export const doctorSchedule = pgTable(
  'doctor_schedule',
  {
    id: uuid().primaryKey().defaultRandom(),
    doctorId: uuid().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
    /** ISO-день недели: 1 = понедельник ... 7 = воскресенье. */
    weekday: smallint().$type<ScheduleDay>().notNull(),
  },
  t => [
    foreignKey({
      name: 'doctor_schedule_doctor_fk',
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
    check('doctor_schedule_weekday_check', sql`${t.weekday} BETWEEN 1 AND 7`),
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
      name: 'doctor_time_slot_doctor_fk',
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
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
    // snapshot-колонки
    date: date({ mode: 'string' }).notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  t => [
    foreignKey({
      name: 'appointment_user_fk',
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'appointment_doctor_fk',
      columns: [t.doctorId],
      foreignColumns: [doctor.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'appointment_time_slot_fk',
      columns: [t.timeSlotId],
      foreignColumns: [doctorTimeSlot.id],
    }).onDelete('set null'),
    unique('appointment_time_slot_unique').on(t.timeSlotId),
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
      name: 'user_favorite_doctor_pk',
      columns: [t.userId, t.doctorId],
    }),
    foreignKey({
      name: 'user_favorite_doctor_user_fk',
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'user_favorite_doctor_doctor_fk',
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
      name: 'user_favorite_medical_center_pk',
      columns: [t.userId, t.medicalCenterId],
    }),
    foreignKey({
      name: 'user_favorite_medical_center_user_fk',
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'user_favorite_medical_center_center_fk',
      columns: [t.medicalCenterId],
      foreignColumns: [medicalCenter.id],
    }).onDelete('cascade'),
  ],
);

export type User = typeof user.$inferSelect;
