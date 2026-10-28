import { DataSource } from 'typeorm';
import { Appointment } from 'src/entities/appointment';
import { DoctorCategory } from 'src/entities/doctor-category.entity';
import { DoctorSchedule } from 'src/entities/doctor-schedule.entity';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { OnboardingSlide } from 'src/entities/onboarding-slide.entity';
import { UserFavoriteDoctor } from 'src/entities/user-favorite-doctor.relation';
import { UserFavoriteMedicalCenter } from 'src/entities/user-favorite-medical-center.relation';
import { User } from 'src/entities/user.entity';

const ENTITIES = [
  Appointment,
  Doctor,
  DoctorCategory,
  DoctorSchedule,
  DoctorTimeSlot,
  MedicalCenter,
  OnboardingSlide,
  User,
  UserFavoriteDoctor,
  UserFavoriteMedicalCenter,
];

/**
 * Подключение к тестовой БД с пересозданием схемы.
 * `dropSchema` разрушителен, поэтому работаем только с БД, имя которой оканчивается на `_test`.
 */
export const createTestDataSource = async () => {
  const database = process.env.TEST_DATABASE_NAME ?? 'healthpal_test';

  if (!database.endsWith('_test')) {
    throw new Error(
      `Интеграционные тесты сбрасывают схему, имя БД должно оканчиваться на "_test", получено "${database}"`,
    );
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.TEST_DATABASE_HOST ?? 'localhost',
    port: Number(process.env.TEST_DATABASE_PORT ?? 5433),
    username: process.env.TEST_DATABASE_USER ?? 'test',
    password: process.env.TEST_DATABASE_PASSWORD ?? 'test',
    database,
    entities: ENTITIES,
    synchronize: true,
    dropSchema: true,
  });

  return dataSource.initialize();
};

/** Очищает данные между тестами, схема остаётся. */
export const clearDatabase = async (dataSource: DataSource) => {
  const tables = dataSource.entityMetadatas
    .map(meta => `"${meta.tableName}"`)
    .join(', ');

  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
};
