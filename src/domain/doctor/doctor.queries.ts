import { eq, getTableColumns } from 'drizzle-orm';
import { localized, type Locale } from 'src/common/i18n/locale';
import type { Database } from 'src/db/db.module';
import {
  doctor,
  doctorCategory,
  medicalCenter,
  userFavoriteDoctor,
} from 'src/db/schema';
import {
  favoriteOfUser,
  isFavorite,
} from './modules/doctor-favorite/doctor-favorite.queries';

/** Join condition of a doctor with their center: `.innerJoin(medicalCenter, centerOfDoctor)`. */
export const centerOfDoctor = eq(medicalCenter.id, doctor.medicalCenterId);

/** Doctor columns with the translatable ones in the request locale. */
export const doctorColumns = (locale: Locale) => ({
  ...getTableColumns(doctor),
  name: localized(doctor.name, locale),
  surname: localized(doctor.surname, locale),
  description: localized(doctor.description, locale),
});

/** Center name and address in the request locale, as shown next to a doctor. */
export const centerLabel = (locale: Locale) => ({
  name: localized(medicalCenter.name, locale),
  address: localized(medicalCenter.address, locale),
});

/** Doctor with category, center (name, address) and the favorite flag; the caller adds `where`, sorting and pagination. */
export const selectDoctors = (db: Database, userId: string, locale: Locale) =>
  db
    .select({
      ...doctorColumns(locale),
      category: { type: doctorCategory.type },
      medicalCenter: centerLabel(locale),
      isFavorite,
    })
    .from(doctor)
    .innerJoin(doctorCategory, eq(doctorCategory.id, doctor.categoryId))
    .innerJoin(medicalCenter, centerOfDoctor)
    .leftJoin(userFavoriteDoctor, favoriteOfUser(userId))
    .$dynamic();
