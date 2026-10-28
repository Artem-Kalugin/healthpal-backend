import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  Doctor,
  DoctorJoinsStructure,
  DoctorRelationKeys,
} from 'src/entities/doctor.entity';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { WithDoctorMedicalCenterNameAndAdress } from './specification/with-medical-center-name-and-adress.specification';
import { WithDoctorCategoryType } from './specification/with-category-type.specification';
import {
  favoritedByUserAtPropertyName,
  WithIsUserFavorite,
} from '../users/specification/with-user-favorite.specifiaction';
import { UserJoinsStructure, UserRelationKeys } from 'src/entities/user.entity';
import { FilterByRelation } from './specification/filter-by-relation.specification';
import { AliasedSlugs } from 'declarations';
import {
  getPaginatedUsingLimitOffest,
  getPaginatedUsingSkipTake,
} from 'src/common/helpers/pagination/paginate';
import { SortOrder } from 'src/common/config';
import { escapeLike } from 'src/common/helpers/escape-like';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';
import { mapDoctorWithRaw } from './doctor.mapper';
import { DoctorFavoritesQueryDto } from './dto/doctor-favorites.dto';

const UserFavoriteMeta = UserJoinsStructure[UserRelationKeys.FAVORITE_DOCTORS];

const ALIAS = 'doctor' as const;

const sortMap: Record<string, AliasedSlugs<typeof ALIAS, Doctor>> = {
  rating: `${ALIAS}.rating`,
  reviews: `${ALIAS}.reviewsCount`,
  practiceStartYear: `${ALIAS}.practiceStartYear`,
} as const;

@Injectable()
export class DoctorService {
  constructor(
    @Inject(getEntityRepository(Doctor.name))
    private readonly repo: SafeRepository<Doctor>,
  ) {}

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

    const qb = this.baseQueryBuilderForUser(userId);
    if (categoryId)
      new FilterByRelation(
        ALIAS,
        categoryId,
        DoctorJoinsStructure[DoctorRelationKeys.CATEGORY],
      ).apply(qb);
    if (medicalCenterId)
      new FilterByRelation(
        ALIAS,
        medicalCenterId,
        DoctorJoinsStructure[DoctorRelationKeys.MEDICAL_CENTER],
      ).apply(qb);

    if (searchFor) {
      const term = `%${escapeLike(searchFor)}%`;
      qb.andWhere(
        `(
      CONCAT(${ALIAS}.name, ' ', ${ALIAS}.surname) ILIKE :term OR
      ${DoctorRelationKeys.MEDICAL_CENTER}.name ILIKE :term OR
      ${DoctorRelationKeys.MEDICAL_CENTER}.address ILIKE :term
    )`,
        { term },
      );
    }

    if (sort) {
      qb.orderBy(sortMap[sort], order);
      qb.addOrderBy(`${ALIAS}.id`, SortOrder.ASC);
    } else {
      qb.orderBy(`${ALIAS}.id`, SortOrder.ASC);
    }

    const res = await getPaginatedUsingSkipTake(qb, page, size);

    return { ...res, data: mapDoctorWithRaw(res.data) };
  }

  async findFavoritesForUser(
    parameters: DoctorFavoritesQueryDto & { userId: string },
  ) {
    const { userId, page, size } = parameters;
    const qb = this.baseQueryBuilderForUser(userId);

    qb.andWhere(`t.${UserFavoriteMeta.inverseJoinColumn.name} = :userId`, {
      userId,
    });

    qb.orderBy(`"${favoritedByUserAtPropertyName}"`, SortOrder.DESC);

    const res = await getPaginatedUsingLimitOffest(qb, page, size);

    return { ...res, data: mapDoctorWithRaw(res.data) };
  }

  async existsById(doctorId: string) {
    return this.repo.existsBy({ id: doctorId });
  }

  async findOneForUser(userId: string, doctorId: string) {
    const qb = this.baseQueryBuilderForUser(userId);

    qb.andWhere(`${ALIAS}.id = :doctorId`, { doctorId });

    const [doctor] = mapDoctorWithRaw(await qb.getRawAndEntities());
    if (!doctor) throw new NotFoundException();

    return doctor;
  }

  baseQueryBuilderForUser(userId: string) {
    const qb = this.repo.createQueryBuilder(ALIAS);

    new WithDoctorMedicalCenterNameAndAdress(ALIAS).apply(qb);
    new WithDoctorCategoryType(ALIAS).apply(qb);
    const qbWithFavorite = new WithIsUserFavorite<
      Doctor & { isFavorite: boolean }
      //@ts-expect-error attaches isFavorite
    >(UserFavoriteMeta, ALIAS, userId, false).apply(qb);

    return qbWithFavorite;
  }
}
