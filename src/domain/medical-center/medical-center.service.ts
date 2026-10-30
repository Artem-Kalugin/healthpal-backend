import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { paginate } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import { descNullsLast } from 'src/db/order';
import { medicalCenter, userFavoriteMedicalCenter } from 'src/db/schema';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';
import {
  distanceTo,
  favoritedAt,
  rating,
  selectCenters,
} from './medical-center.queries';

const TOP_LIMIT = 5;
/** Average walking speed, km/h. */
const WALKING_SPEED = 5;

@Injectable()
export class MedicalCenterService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findWithDistanceForUser(
    userId: string,
    lat: number,
    lon: number,
    top5Only: boolean,
  ) {
    const distance = distanceTo({ lat, lon });
    const query = selectCenters(this.db, userId, { distance }).orderBy(
      asc(distance),
      asc(medicalCenter.id),
    );

    const rows = await (top5Only ? query.limit(TOP_LIMIT) : query);

    return rows.map(center => ({
      ...center,
      walkingTimeMinutes: Math.round((center.distance / WALKING_SPEED) * 60),
    }));
  }

  async findByRatingForUser(userId: string, top5Only: boolean) {
    const query = selectCenters(this.db, userId).orderBy(
      descNullsLast(rating),
      asc(medicalCenter.id),
    );

    return top5Only ? query.limit(TOP_LIMIT) : query;
  }

  async findFavoritesForUser(
    userId: string,
    query: MedicalCenterFavoritesQueryDto,
  ) {
    const { page, size } = query;
    const userFavorites = eq(userFavoriteMedicalCenter.userId, userId);

    return paginate(
      selectCenters(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(favoritedAt), asc(medicalCenter.id)),
      { page, size },
    );
  }

  async addToFavoritesForUser(userId: string, medicalCenterId: string) {
    if (!(await existsById(this.db, medicalCenter, medicalCenterId))) {
      throw new AppException(ErrorCode.MEDICAL_CENTER_NOT_FOUND);
    }

    const inserted = await this.db
      .insert(userFavoriteMedicalCenter)
      .values({ userId, medicalCenterId })
      .onConflictDoNothing()
      .returning({
        medicalCenterId: userFavoriteMedicalCenter.medicalCenterId,
      });

    if (inserted.length === 0) {
      throw new AppException(ErrorCode.FAVORITE_ALREADY_EXISTS, {
        message: 'Medical center is already in favorites',
      });
    }

    return { success: true, medicalCenterId };
  }

  async removeFromFavoritesForUser(userId: string, medicalCenterId: string) {
    await this.db
      .delete(userFavoriteMedicalCenter)
      .where(
        and(
          eq(userFavoriteMedicalCenter.userId, userId),
          eq(userFavoriteMedicalCenter.medicalCenterId, medicalCenterId),
        ),
      );
  }
}
