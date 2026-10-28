import { DataSource } from 'typeorm';
import { Appointment } from 'src/entities/appointment';
import {
  DoctorCategory,
  DoctorCategoryType,
} from 'src/entities/doctor-category.entity';
import { DoctorTimeSlot } from 'src/entities/doctor-time-slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
import {
  MedicalCenter,
  MedicalCenterType,
} from 'src/entities/medical-center.entity';
import { User } from 'src/entities/user.entity';

const IMAGE = { image: 'image.jpg', thumbhash: 'thumbhash' };

let sequence = 0;
const next = () => ++sequence;

export const createFactories = (dataSource: DataSource) => {
  const medicalCenter = (overrides: Partial<MedicalCenter> = {}) =>
    dataSource.getRepository(MedicalCenter).save({
      name: `Center ${next()}`,
      address: 'ул. Тверская, д. 1',
      city: 'Москва',
      image: IMAGE,
      lat: 55.75,
      lon: 37.61,
      type: MedicalCenterType.CLINIC,
      timezone: 'Europe/Moscow',
      ...overrides,
    });

  const category = (overrides: Partial<DoctorCategory> = {}) =>
    dataSource.getRepository(DoctorCategory).save({
      type: DoctorCategoryType.GENERAL,
      icon: 'icon',
      ...overrides,
    });

  const user = (overrides: Partial<User> = {}) =>
    dataSource.getRepository(User).save({
      name: 'Иван',
      surname: 'Иванов',
      phone: `+7900${String(next()).padStart(7, '0')}`,
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      password: 'hash',
      ...overrides,
    });

  /** Без явных `medicalCenter`/`category` создаёт их сам. */
  const doctor = async (overrides: Partial<Doctor> = {}) =>
    dataSource.getRepository(Doctor).save({
      name: 'Пётр',
      surname: 'Петров',
      practiceStartYear: 2010,
      patientsCount: 100,
      reviewsCount: 10,
      image: IMAGE,
      rating: 4.5,
      description: 'Врач',
      medicalCenter: overrides.medicalCenter ?? (await medicalCenter()),
      category: overrides.category ?? (await category()),
      ...overrides,
    });

  const timeSlot = (
    doctorId: string,
    overrides: Partial<DoctorTimeSlot> = {},
  ) =>
    dataSource.getRepository(DoctorTimeSlot).save({
      doctorId,
      date: '2026-11-03',
      startTime: '10:00:00',
      endTime: '10:30:00',
      ...overrides,
    });

  /** Запись на слот; время копируется из слота, как делает сервис. */
  const appointment = (
    userId: string,
    slot: DoctorTimeSlot,
    overrides: Partial<Appointment> = {},
  ) =>
    dataSource.getRepository(Appointment).save({
      userId,
      doctorId: slot.doctorId,
      timeSlotId: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...overrides,
    });

  return { medicalCenter, category, user, doctor, timeSlot, appointment };
};
