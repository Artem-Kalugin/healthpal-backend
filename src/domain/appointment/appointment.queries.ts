import { eq, getTableColumns, sql } from 'drizzle-orm';
import { getTableColumnsExcluding } from 'src/db/columns';
import type { Database } from 'src/db/db.module';
import { centerOfDoctor } from '../doctor/doctor.queries';
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
      ...getTableColumns(appointment),
      doctor: getTableColumnsExcluding(doctor, [
        'categoryId',
        'medicalCenterId',
      ]),
      category: { type: doctorCategory.type },
      medicalCenter: {
        name: medicalCenter.name,
        address: medicalCenter.address,
      },
    })
    .from(appointment)
    .innerJoin(doctor, eq(doctor.id, appointment.doctorId))
    .innerJoin(doctorCategory, eq(doctorCategory.id, doctor.categoryId))
    .innerJoin(medicalCenter, centerOfDoctor)
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
