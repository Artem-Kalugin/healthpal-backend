/**
 * Имена ограничений (FK, unique, check, pk): единственный источник для схемы, миграций, обработки ошибок и тестов.
 * Строки попадают в `drizzle/*.sql` и в `constraint` ошибки Postgres; правка значения = пересоздание ограничения.
 */
export enum Constraint {
  DOCTOR_CATEGORY_FK = 'doctor_category_fk',
  DOCTOR_MEDICAL_CENTER_FK = 'doctor_medical_center_fk',

  USER_PHONE_UNIQUE = 'user_phone_unique',
  USER_NICKNAME_UNIQUE = 'user_nickname_unique',
  USER_PHONE_FORMAT_CHECK = 'user_phone_format_check',
  USER_BIRTHDAY_PAST_CHECK = 'user_birthday_past_check',

  DOCTOR_SCHEDULE_DOCTOR_FK = 'doctor_schedule_doctor_fk',
  DOCTOR_SCHEDULE_WEEKDAY_CHECK = 'doctor_schedule_weekday_check',

  DOCTOR_TIME_SLOT_DOCTOR_FK = 'doctor_time_slot_doctor_fk',

  APPOINTMENT_USER_FK = 'appointment_user_fk',
  APPOINTMENT_DOCTOR_FK = 'appointment_doctor_fk',
  APPOINTMENT_TIME_SLOT_FK = 'appointment_time_slot_fk',
  APPOINTMENT_TIME_SLOT_UNIQUE = 'appointment_time_slot_unique',

  USER_FAVORITE_DOCTOR_PK = 'user_favorite_doctor_pk',
  USER_FAVORITE_DOCTOR_USER_FK = 'user_favorite_doctor_user_fk',
  USER_FAVORITE_DOCTOR_DOCTOR_FK = 'user_favorite_doctor_doctor_fk',

  USER_FAVORITE_MEDICAL_CENTER_PK = 'user_favorite_medical_center_pk',
  USER_FAVORITE_MEDICAL_CENTER_USER_FK = 'user_favorite_medical_center_user_fk',
  USER_FAVORITE_MEDICAL_CENTER_CENTER_FK = 'user_favorite_medical_center_center_fk',
}
