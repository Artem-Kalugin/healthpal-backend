export enum DoctorCategoryType {
  DENTISTRY = 'dentistry',
  CARDIOLOGY = 'cardiology',
  PULMONOLOGY = 'pulmonology',
  GENERAL = 'general',
  NEUROLOGY = 'neurology',
  GASTROENTEROLOGY = 'gastroenterology',
  LABORATORY = 'laboratory',
  VACCINATION = 'vaccination',
}

export enum MedicalCenterType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  CABINET = 'cabinet',
}

/** Catalog set of a medical center: `RU` is the Russian one, `EU` the European one (Berlin). */
export enum Region {
  RU = 'RU',
  EU = 'EU',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/** ISO weekday, stored in the DB as a number. */
export enum ScheduleDay {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}
