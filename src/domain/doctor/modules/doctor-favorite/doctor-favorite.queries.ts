import { and, eq, sql } from 'drizzle-orm';
import { doctor, userFavoriteDoctor } from 'src/db/schema';

/** Join condition of the user's favorite link with a doctor: `.leftJoin(userFavoriteDoctor, favoriteOfUser(userId))`. */
export const favoriteOfUser = (userId: string) =>
  and(
    eq(userFavoriteDoctor.doctorId, doctor.id),
    eq(userFavoriteDoctor.userId, userId),
  );

/** Valid only in a query that joins `userFavoriteDoctor` through `favoriteOfUser`. */
export const isFavorite = sql<boolean>`${userFavoriteDoctor.userId} is not null`;
