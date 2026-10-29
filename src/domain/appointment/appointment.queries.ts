import { eq, sql } from 'drizzle-orm';
import type { Database } from 'src/db/db.module';
import {
  appointment,
  doctor,
  doctorCategory,
  medicalCenter,
} from 'src/db/schema';

/** Момент начала записи в абсолютном времени: `date` и `startTime` заданы по часам центра. */
export const appointmentStartAt = sql<Date>`((${appointment.date} + ${appointment.startTime}) at time zone ${medicalCenter.timezone})`;

/**
 * Запись с врачом, его категорией и центром (имя, адрес); `where`, сортировку и пагинацию добавляет вызывающий.
 * Drizzle не вкладывает селект глубже одного уровня, поэтому строку нужно пропустить через `nestDoctor`.
 */
export const selectAppointments = (db: Database) =>
  db
    .select({
      id: appointment.id,
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      timeSlotId: appointment.timeSlotId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      isCancelled: appointment.isCancelled,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        surname: doctor.surname,
        image: doctor.image,
        rating: doctor.rating,
        reviewsCount: doctor.reviewsCount,
        patientsCount: doctor.patientsCount,
        practiceStartYear: doctor.practiceStartYear,
        description: doctor.description,
      },
      category: { type: doctorCategory.type },
      medicalCenter: {
        name: medicalCenter.name,
        address: medicalCenter.address,
      },
    })
    .from(appointment)
    .innerJoin(doctor, eq(doctor.id, appointment.doctorId))
    .innerJoin(doctorCategory, eq(doctorCategory.id, doctor.categoryId))
    .innerJoin(medicalCenter, eq(medicalCenter.id, doctor.medicalCenterId))
    .$dynamic();

type Row = Awaited<ReturnType<typeof selectAppointments>>[number];

export const nestDoctor = ({
  doctor,
  category,
  medicalCenter,
  ...rest
}: Row) => ({
  ...rest,
  doctor: { ...doctor, category, medicalCenter },
});
