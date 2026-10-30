import { and, getTableColumns, eq, sql, type SQL } from 'drizzle-orm';
import type { Database } from 'src/db/db.module';
import {
  doctor,
  medicalCenter,
  userFavoriteMedicalCenter,
} from 'src/db/schema';
import { centerOfDoctor } from 'src/domain/doctor/doctor.queries';

export type Point = { lat: number; lon: number };

/** Distance to the center in km with one decimal (haversine with `acos` clamped to [-1, 1]). */
export const distanceTo = ({ lat, lon }: Point) =>
  sql<number>`round((6371 * acos(least(1, greatest(-1,
    cos(radians(${lat})) * cos(radians(${medicalCenter.lat})) *
    cos(radians(${medicalCenter.lon}) - radians(${lon})) +
    sin(radians(${lat})) * sin(radians(${medicalCenter.lat}))
  ))))::numeric, 1)`.mapWith(Number);

/** Sum of the reviews of the center doctors; `bigint` arrives as a string. */
export const reviewsCount = sql<string>`coalesce(sum(${doctor.reviewsCount}), 0)`;

/** Center rating: average over doctors weighted by reviews; `null` without reviews. */
export const rating = sql<string | null>`case
  when sum(${doctor.reviewsCount}) > 0
  then round(sum(${doctor.rating} * ${doctor.reviewsCount}) / sum(${doctor.reviewsCount}), 2)
  else null
end`;

export const favoritedAt = sql<Date | null>`max(${userFavoriteMedicalCenter.createdAt})`;

/**
 * Centers with doctor aggregates and the favorite flag for the user.
 * Returns a dynamic builder: the caller adds sorting, `where` and pagination.
 * Favorites are joined by primary key (at most one row per center), so the doctor sums are not inflated.
 */
export const selectCenters = <
  Extra extends Record<string, SQL> = Record<never, SQL>,
>(
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
