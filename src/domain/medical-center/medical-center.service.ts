import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import { paginate } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import { descNullsLast } from 'src/db/order';
import { medicalCenter, userFavoriteMedicalCenter } from 'src/db/schema';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';
import {
  distanceTo,
  favoritedAt,
  rating,
  selectCenters,
} from './medical-center.queries';

const TOP_LIMIT = 5;
/** Средняя скорость пешком, км/ч. */
const WALKING_SPEED = 5;

@Injectable()
export class MedicalCentersService {
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
    parameters: MedicalCenterFavoritesQueryDto & { userId: string },
  ) {
    const { userId, page, size } = parameters;
    const userFavorites = eq(userFavoriteMedicalCenter.userId, userId);

    return paginate({ page, size }, ({ limit, offset }) =>
      selectCenters(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(favoritedAt), asc(medicalCenter.id))
        .limit(limit)
        .offset(offset),
    );
  }

  async existsById(medicalCenterId: string) {
    return existsById(this.db, medicalCenter, medicalCenterId);
  }
}
