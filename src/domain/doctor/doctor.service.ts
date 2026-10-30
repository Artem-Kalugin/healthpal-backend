import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { SortOrder } from 'src/common/config';
import { escapeLike } from 'src/common/helpers/escape-like';
import { firstOrThrow } from 'src/common/helpers/first-or-throw';
import { paginate } from 'src/common/pagination/page';
import { DB } from 'src/db/db.module';
import type { Database } from 'src/db/db.module';
import { existsById } from 'src/db/exists';
import { doctor, medicalCenter } from 'src/db/schema';
import {
  DoctorSearchQueryDto,
  DoctorSort,
} from './dto/doctor-search-query.dto';
import { localized } from 'src/common/i18n/locale';
import type { RequestContext } from 'src/common/i18n/request-context';
import { unaccent, unaccentedTerm } from 'src/common/i18n/search';
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

  async searchForUser(
    userId: string,
    query: DoctorSearchQueryDto,
    { locale }: RequestContext,
  ) {
    const {
      page,
      size,
      searchFor,
      categoryId,
      medicalCenterId,
      sort,
      order = SortOrder.DESC,
    } = query;

    const term = searchFor
      ? unaccentedTerm(`%${escapeLike(searchFor)}%`)
      : undefined;
    const where = and(
      categoryId ? eq(doctor.categoryId, categoryId) : undefined,
      medicalCenterId ? eq(doctor.medicalCenterId, medicalCenterId) : undefined,
      term
        ? or(
            ilike(
              unaccent(
                sql`(${localized(doctor.name, locale)} || ' ' || ${localized(doctor.surname, locale)})`,
              ),
              term,
            ),
            ilike(unaccent(localized(medicalCenter.name, locale)), term),
            ilike(unaccent(localized(medicalCenter.address, locale)), term),
          )
        : undefined,
    );
    const direction = order === SortOrder.ASC ? asc : desc;

    return paginate(
      selectDoctors(this.db, userId, locale)
        .where(where)
        .orderBy(
          ...(sort ? [direction(sortColumns[sort])] : []),
          asc(doctor.id),
        ),
      { page, size },
    );
  }

  async existsById(doctorId: string) {
    return existsById(this.db, doctor, doctorId);
  }

  async findOneForUser(
    userId: string,
    doctorId: string,
    { locale }: RequestContext,
  ) {
    return firstOrThrow(
      await selectDoctors(this.db, userId, locale).where(
        eq(doctor.id, doctorId),
      ),
      () => new AppException(ErrorCode.DOCTOR_NOT_FOUND),
    );
  }
}
