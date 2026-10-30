import { eq, getTableColumns } from 'drizzle-orm';
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

/** Doctor with category, center (name, address) and the favorite flag; the caller adds `where`, sorting and pagination. */
export const selectDoctors = (db: Database, userId: string) =>
  db
    .select({
      ...getTableColumns(doctor),
      category: { type: doctorCategory.type },
      medicalCenter: {
        name: medicalCenter.name,
        address: medicalCenter.address,
      },
      isFavorite,
    })
    .from(doctor)
    .innerJoin(doctorCategory, eq(doctorCategory.id, doctor.categoryId))
    .innerJoin(medicalCenter, centerOfDoctor)
    .leftJoin(userFavoriteDoctor, favoriteOfUser(userId))
    .$dynamic();
