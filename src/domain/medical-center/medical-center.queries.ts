import {
  and,
  getTableColumns,
  eq,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import type { Database } from 'src/db/db.module';
import {
  doctor,
  medicalCenter,
  userFavoriteMedicalCenter,
} from 'src/db/schema';
import { centerOfDoctor } from '../doctor/doctor.queries';

export type Point = { lat: number; lon: number };

/** Расстояние до центра в км с одним знаком (хаверсин с зажимом `acos` в [-1, 1]). */
export const distanceTo = ({ lat, lon }: Point) =>
  sql<number>`round((6371 * acos(least(1, greatest(-1,
    cos(radians(${lat})) * cos(radians(${medicalCenter.lat})) *
    cos(radians(${medicalCenter.lon}) - radians(${lon})) +
    sin(radians(${lat})) * sin(radians(${medicalCenter.lat}))
  ))))::numeric, 1)`.mapWith(Number);

/** Сумма отзывов врачей центра; `bigint` приходит строкой. */
export const reviewsCount = sql<string>`coalesce(sum(${doctor.reviewsCount}), 0)`;

/** Рейтинг центра: среднее по врачам, взвешенное по отзывам; без отзывов `null`. */
export const rating = sql<string | null>`case
  when sum(${doctor.reviewsCount}) > 0
  then round(sum(${doctor.rating} * ${doctor.reviewsCount}) / sum(${doctor.reviewsCount}), 2)
  else null
end`;

export const favoritedAt = sql<Date | null>`max(${userFavoriteMedicalCenter.createdAt})`;

/** `nulls last` в билдере Drizzle задаётся только сырым фрагментом. */
export const descNullsLast = (expression: SQLWrapper): SQL =>
  sql`${expression} desc nulls last`;

/**
 * Центры с агрегатами по врачам и флагом избранного для пользователя.
 * Возвращает динамический билдер: сортировку, `where` и пагинацию добавляет вызывающий.
 * Избранное джойнится по первичному ключу (не больше одной строки на центр), поэтому суммы по врачам не раздуваются.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const selectCenters = <Extra extends Record<string, SQL> = {}>(
  db: Database,
  userId: string,

  extra: Extra = {} as Extra,
) =>
  db
    .select({
      ...getTableColumns(medicalCenter),
      reviewsCount,
      rating,
      isFavorite: sql<boolean>`bool_or(${userFavoriteMedicalCenter.userId} is not null)`,
      ...extra,
    })
    .from(medicalCenter)
    .leftJoin(doctor, centerOfDoctor)
    .leftJoin(
      userFavoriteMedicalCenter,
      and(
        eq(userFavoriteMedicalCenter.medicalCenterId, medicalCenter.id),
        eq(userFavoriteMedicalCenter.userId, userId),
      ),
    )
    .groupBy(medicalCenter.id)
    .$dynamic();
