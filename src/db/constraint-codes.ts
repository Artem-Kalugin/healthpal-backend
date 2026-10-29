/** Имя ограничения → код ошибки для клиента. Имена заданы явно в `schema.ts`; ограничения без записи отдают только статус. */
export const CONSTRAINT_ERROR_CODES = new Map([
  ['user_phone_unique', 'USER_PHONE_TAKEN'],
  ['user_nickname_unique', 'USER_NICKNAME_TAKEN'],
  ['appointment_time_slot_unique', 'APPOINTMENT_SLOT_TAKEN'],
  ['user_favorite_doctor_pk', 'FAVORITE_ALREADY_EXISTS'],
  ['user_favorite_medical_center_pk', 'FAVORITE_ALREADY_EXISTS'],
  ['user_phone_format_check', 'USER_PHONE_INVALID'],
  ['user_birthday_past_check', 'USER_BIRTHDAY_INVALID'],
  ['doctor_schedule_weekday_check', 'SCHEDULE_WEEKDAY_INVALID'],
]);
