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

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/** ISO-день недели, хранится в БД числом. */
export enum ScheduleDay {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}
