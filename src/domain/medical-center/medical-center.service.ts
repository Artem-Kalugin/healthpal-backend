import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import { descNullsLast } from 'src/db/order';
import type { Locale } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import { medicalCenter } from 'src/db/schema';
import { GetMedicalCentersDto } from './dto/get-medical-centers.dto';
import { distanceTo, rating, selectCenters } from './medical-center.queries';

const TOP_LIMIT = 5;
/** Average walking speed, km/h. */
const WALKING_SPEED = 5;

type CenterRow = Omit<
  typeof medicalCenter.$inferSelect,
  'name' | 'address' | 'city'
> & {
  name: string;
  address: string;
  city: string;
  reviewsCount: string;
  rating: string | null;
  isFavorite: boolean;
  distance?: number;
  walkingTimeMinutes?: number;
};

@Injectable()
export class MedicalCenterService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async existsById(medicalCenterId: string) {
    return existsById(this.db, medicalCenter, medicalCenterId);
  }

  /** With coordinates, centers are sorted by distance; without, by rating. */
  async findForUser(
    userId: string,
    query: GetMedicalCentersDto,
    { locale }: RequestContext,
  ): Promise<CenterRow[]> {
    const { lat, lon, shouldTake5Only } = query;

    return lat && lon
      ? this.findWithDistance(userId, locale, +lat, +lon, shouldTake5Only)
      : this.findByRating(userId, locale, shouldTake5Only);
  }

  private async findWithDistance(
    userId: string,
    locale: Locale,
    lat: number,
    lon: number,
    shouldTake5Only: boolean,
  ) {
    const distance = distanceTo({ lat, lon });
    const query = selectCenters(this.db, userId, locale, { distance }).orderBy(
      asc(distance),
      asc(medicalCenter.id),
    );

    const rows = await (shouldTake5Only ? query.limit(TOP_LIMIT) : query);

    return rows.map(center => ({
      ...center,
      walkingTimeMinutes: Math.round((center.distance / WALKING_SPEED) * 60),
    }));
  }

  private async findByRating(
    userId: string,
    locale: Locale,
    shouldTake5Only: boolean,
  ) {
    const query = selectCenters(this.db, userId, locale).orderBy(
      descNullsLast(rating),
      asc(medicalCenter.id),
    );

    return shouldTake5Only ? query.limit(TOP_LIMIT) : query;
  }
}
