import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { SortOrder } from 'src/common/config';
import { escapeLike } from 'src/common/helpers/escape-like';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { paginate } from 'src/common/helpers/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import { doctor, medicalCenter, userFavoriteDoctor } from 'src/db/schema';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';
import {
  DoctorSearchQueryDto,
  DoctorSort,
} from './dto/doctor-search-query.dto';
import { selectDoctors } from './doctor.queries';
import { AppException } from 'src/common/errors/app.exception';
import { ErrorCode } from 'src/common/errors/error-code';

const sortColumns: Record<DoctorSort, PgColumn> = {
  [DoctorSort.RATING]: doctor.rating,
  [DoctorSort.REVIEWS]: doctor.reviewsCount,
  [DoctorSort.PRACTICE_START_YEAR]: doctor.practiceStartYear,
};

@Injectable()
export class DoctorService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async searchForUser(userId: string, query: DoctorSearchQueryDto) {
    const {
      page,
      size,
      searchFor,
      categoryId,
      medicalCenterId,
      sort,
      order = SortOrder.DESC,
    } = query;

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

    return paginate(
      selectDoctors(this.db, userId)
        .where(where)
        .orderBy(
          ...(sort ? [direction(sortColumns[sort])] : []),
          asc(doctor.id),
        ),
      { page, size },
    );
  }

  async findFavoritesForUser(userId: string, query: DoctorFavoritesQueryDto) {
    const { page, size } = query;
    const userFavorites = eq(userFavoriteDoctor.userId, userId);

    return paginate(
      selectDoctors(this.db, userId)
        .where(userFavorites)
        .orderBy(desc(userFavoriteDoctor.createdAt), asc(doctor.id)),
      { page, size },
    );
  }

  async addToFavoritesForUser(userId: string, doctorId: string) {
    if (!(await this.existsById(doctorId))) {
      throw new AppException(ErrorCode.DOCTOR_NOT_FOUND);
    }

    // An empty result means the link already existed (including a request race)
    const inserted = await this.db
      .insert(userFavoriteDoctor)
      .values({ userId, doctorId })
      .onConflictDoNothing()
      .returning({ doctorId: userFavoriteDoctor.doctorId });

    if (inserted.length === 0) {
      throw new AppException(ErrorCode.FAVORITE_ALREADY_EXISTS, {
        message: 'Doctor is already in favorites',
      });
    }

    return { success: true, doctorId };
  }

  async removeFromFavoritesForUser(userId: string, doctorId: string) {
    await this.db
      .delete(userFavoriteDoctor)
      .where(
        and(
          eq(userFavoriteDoctor.userId, userId),
          eq(userFavoriteDoctor.doctorId, doctorId),
        ),
      );
  }

  async existsById(doctorId: string) {
    return existsById(this.db, doctor, doctorId);
  }

  async findOneForUser(userId: string, doctorId: string) {
    return firstOrThrow(
      await selectDoctors(this.db, userId).where(eq(doctor.id, doctorId)),
      () => new AppException(ErrorCode.DOCTOR_NOT_FOUND),
    );
  }
}
