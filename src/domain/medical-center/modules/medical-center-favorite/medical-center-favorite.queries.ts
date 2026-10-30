import { and, eq, sql } from 'drizzle-orm';
import { medicalCenter, userFavoriteMedicalCenter } from 'src/db/schema';

/** Join condition of the user's favorite link with a center: `.leftJoin(userFavoriteMedicalCenter, favoriteOfUser(userId))`. */
export const favoriteOfUser = (userId: string) =>
  and(
    eq(userFavoriteMedicalCenter.medicalCenterId, medicalCenter.id),
    eq(userFavoriteMedicalCenter.userId, userId),
  );

/** Valid only in a grouped query that joins `userFavoriteMedicalCenter` through `favoriteOfUser`. */
export const isFavorite = sql<boolean>`bool_or(${userFavoriteMedicalCenter.userId} is not null)`;

export const favoritedAt = sql<Date | null>`max(${userFavoriteMedicalCenter.createdAt})`;
