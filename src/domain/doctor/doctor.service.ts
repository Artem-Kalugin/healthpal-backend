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
import { WithIsUserFavorite } from '../users/specification/with-user-favorite.specifiaction';
import { UserJoinsStructure, UserRelationKeys } from 'src/entities/user.entity';
import { FilterByRelation } from './specification/filter-by-relation.specification';
import { AliasedSlugs } from 'declarations';
import { takePaginated } from 'src/common/helpers/pagination/paginate';
import { SortOrder } from 'src/common/config';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';

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
      const term = `%${searchFor}%`;
      qb.andWhere(
        `(
      ${ALIAS}.name ILIKE :term OR
      ${ALIAS}.surname ILIKE :term OR
      ${ALIAS}.description ILIKE :term OR
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

    return takePaginated(qb, page, size);
  }

  async findOneForUser(userId: string, doctorId: string) {
    const qb = this.baseQueryBuilderForUser(userId);

    qb.andWhere(`${ALIAS}.id = :doctorId`, { doctorId });

    const doctor = await qb.getOne();
    if (!doctor) {
      throw new NotFoundException();
    }

    return doctor;
  }

  baseQueryBuilderForUser(userId: string) {
    const qb = this.repo.createQueryBuilder(ALIAS);

    new WithDoctorMedicalCenterNameAndAdress(ALIAS).apply(qb);
    new WithDoctorCategoryType(ALIAS).apply(qb);
    const qbWithFavorite = new WithIsUserFavorite<
      Doctor & { isFavorite: boolean }
    >(
      UserFavoriteMeta,
      ALIAS,
      'isFavorite',
      userId,
      //@ts-expect-error attaches isFavorite
    ).apply(qb);

    return qbWithFavorite;
  }
}
