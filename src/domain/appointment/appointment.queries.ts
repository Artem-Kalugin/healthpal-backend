import { eq, getTableColumns, sql } from 'drizzle-orm';
import type { Locale } from 'src/common/i18n/locale';
import type { Database } from 'src/db/db.module';
import {
  centerLabel,
  centerOfDoctor,
  doctorColumns,
} from 'src/domain/doctor/doctor.queries';
import {
  appointment,
  doctor,
  doctorCategory,
  medicalCenter,
} from 'src/db/schema';

/** Absolute start of the appointment: `date` and `startTime` are on the center's clock. */
export const appointmentStartAt = sql<Date>`((${appointment.date} + ${appointment.startTime}) at time zone ${medicalCenter.timezone})`;

/**
 * Appointment with its doctor, category and center (name, address); the caller adds `where`, ordering and pagination.
 * Drizzle does not nest a select deeper than one level, so the row must go through `nestDoctor`.
 */
export const selectAppointments = (db: Database, locale: Locale) =>
  db
    .select({
      ...getTableColumns(appointment),
      doctor: doctorColumns(locale),
      category: { type: doctorCategory.type },
      medicalCenter: centerLabel(locale),
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
