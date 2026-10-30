import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { descNullsLast } from 'src/db/order';
import { medicalCenter } from 'src/db/schema';
import { distanceTo, rating, selectCenters } from './medical-center.queries';

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
}
