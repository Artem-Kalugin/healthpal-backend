import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { SortOrder } from 'src/common/config';
import { escapeLike } from 'src/common/helpers/escape-like';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { paginate } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
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

    return paginate({ page, size }, ({ limit, offset }) =>
      selectDoctors(this.db, userId)
        .where(where)
        .orderBy(
          ...(sort ? [direction(sortColumns[sort])] : []),
          asc(doctor.id),
        )
        .limit(limit)
        .offset(offset),
    );
  }

  async findFavoritesForUser(
    parameters: DoctorFavoritesQueryDto & { userId: string },
  ) {
    const { userId, page, size } = parameters;
    const userFavorites = eq(userFavoriteDoctor.userId, userId);

    return paginate({ page, size }, ({ limit, offset }) =>
      selectDoctors(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(userFavoriteDoctor.createdAt), asc(doctor.id))
        .limit(limit)
        .offset(offset),
    );
  }

  async existsById(doctorId: string) {
    return existsById(this.db, doctor, doctorId);
  }

  async findOneForUser(userId: string, doctorId: string) {
    return firstOrThrow(
      await selectDoctors(this.db, userId).where(eq(doctor.id, doctorId)),
      () => new NotFoundException(),
    );
  }
}
