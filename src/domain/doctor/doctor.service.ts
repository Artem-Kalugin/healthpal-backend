import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { SortOrder } from 'src/common/config';
import { escapeLike } from 'src/common/helpers/escape-like';
import { offsetOf, toPage } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { doctor, medicalCenter, userFavoriteDoctor } from 'src/db/schema';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';
import { selectDoctors } from './doctor.queries';

const sortColumns = {
  rating: doctor.rating,
  reviews: doctor.reviewsCount,
  practiceStartYear: doctor.practiceStartYear,
};

@Injectable()
export class DoctorService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async searchDoctorsForUser(
    parameters: DoctorSearchQueryDto & { userId: string },
  ) {
    const {
      page,
      size,
      searchFor,
      categoryId,
      medicalCenterId,
      sort,
      order = SortOrder.DESC,
      userId,
    } = parameters;

    const term = searchFor ? `%${escapeLike(searchFor)}%` : undefined;
    const where = and(
      categoryId ? eq(doctor.categoryId, categoryId) : undefined,
      medicalCenterId ? eq(doctor.medicalCenterId, medicalCenterId) : undefined,
      term
        ? or(
            ilike(sql`concat(${doctor.name}, ' ', ${doctor.surname})`, term),
            ilike(medicalCenter.name, term),
            ilike(medicalCenter.address, term),
          )
        : undefined,
    );
    const direction = order === SortOrder.ASC ? asc : desc;

    const [data, [{ total }]] = await Promise.all([
      selectDoctors(this.db, userId)
        .where(where)
        .orderBy(
          ...(sort ? [direction(sortColumns[sort])] : []),
          asc(doctor.id),
        )
        .limit(size)
        .offset(offsetOf(page, size)),
      this.db
        .select({ total: count() })
        .from(doctor)
        .innerJoin(medicalCenter, eq(medicalCenter.id, doctor.medicalCenterId))
        .where(where),
    ]);

    return toPage(data, total, page, size);
  }

  async findFavoritesForUser(
    parameters: DoctorFavoritesQueryDto & { userId: string },
  ) {
    const { userId, page, size } = parameters;
    const userFavorites = eq(userFavoriteDoctor.userId, userId);

    const [data, [{ total }]] = await Promise.all([
      selectDoctors(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(userFavoriteDoctor.createdAt), asc(doctor.id))
        .limit(size)
        .offset(offsetOf(page, size)),
      this.db
        .select({ total: count() })
        .from(userFavoriteDoctor)
        .where(userFavorites),
    ]);

    return toPage(data, total, page, size);
  }

  async existsById(doctorId: string) {
    const found = await this.db
      .select({ id: doctor.id })
      .from(doctor)
      .where(eq(doctor.id, doctorId))
      .limit(1);

    return found.length > 0;
  }

  async findOneForUser(userId: string, doctorId: string) {
    const [found] = await selectDoctors(this.db, userId).where(
      eq(doctor.id, doctorId),
    );
    if (!found) throw new NotFoundException();

    return found;
  }
}
