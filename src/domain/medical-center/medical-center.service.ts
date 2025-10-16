import { Inject, Injectable } from '@nestjs/common';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { UserJoinsStructure, UserRelationKeys } from 'src/entities/user.entity';
import {
  favoritedByUserAtPropertyName,
  WithIsUserFavorite,
} from '../users/specification/with-user-favorite.specifiaction';
import { WithDistance } from './specifiactions/with-distance.specification';
import { WithOrderBy } from './specifiactions/with-order-by.specification';
import { mapMedicalCenterWithRaw } from './medical-center.mapper';
import { WithDoctorsAggregates } from './specifiactions/with-doctors-aggregates.specifiaction';
import { MedicalCenterFavoritesQueryDto } from './dto/medical-center-favorites.dto';
import { SortOrder } from 'src/common/config';
import { getPaginatedUsingLimitOffest } from 'src/common/helpers/pagination/paginate';

const ALIAS = 'center' as const;

const UserFavoriteMeta =
  UserJoinsStructure[UserRelationKeys.FAVORITE_MEDICAL_CENTERS];

@Injectable()
export class MedicalCentersService {
  constructor(
    @Inject(getEntityRepository(MedicalCenter.name))
    private readonly repo: SafeRepository<MedicalCenter>,
  ) {}

  async findWithDistanceForUser(
    userId: string,
    lat: number,
    lon: number,
    top5Only: boolean,
  ) {
    const qb = this.buildBaseQueryForUser(userId);

    new WithDistance(ALIAS, lat, lon).apply(qb);
    const qbWithDistance = new WithOrderBy<
      'distance',
      typeof ALIAS,
      MedicalCenter & {
        distance: number;
        isFavorite: boolean;
        rating: string;
        reviewsCount: string;
      }
      // @ts-expect-error attaches distance
    >('distance', 'ASC').apply(qb);

    if (top5Only) {
      qbWithDistance.take(5);
    }

    return mapMedicalCenterWithRaw(await qb.getRawAndEntities());
  }

  async findByRatingForUser(userId: string, top5Only: boolean) {
    const qb = this.buildBaseQueryForUser(userId);

    if (top5Only) {
      qb.take(5);
    }

    return mapMedicalCenterWithRaw(await qb.getRawAndEntities());
  }

  async findFavoritesForUser(
    parameters: MedicalCenterFavoritesQueryDto & { userId: string },
  ) {
    const { userId, page, size } = parameters;
    const qb = this.buildBaseQueryForUser(userId);

    qb.andWhere(`t.${UserFavoriteMeta.inverseJoinColumn.name} = :userId`, {
      userId,
    });

    qb.orderBy(`"${favoritedByUserAtPropertyName}"`, SortOrder.ASC);

    const res = await getPaginatedUsingLimitOffest(qb, page, size);

    return { ...res, data: mapMedicalCenterWithRaw(res.data) };
  }

  async existsById(doctorId: string) {
    return this.repo.existsBy({ id: doctorId });
  }

  private buildBaseQueryForUser(userId: string) {
    const qb = this.repo.createQueryBuilder(ALIAS);

    const qbWithFavorite = new WithIsUserFavorite<
      MedicalCenter & { isFavorite: boolean }
      //@ts-expect-error attaches isFavorite
    >(UserFavoriteMeta, ALIAS, userId, true).apply(qb);

    const qbWithFavoriteWithDoctorsReviewsAndRating = new WithDoctorsAggregates<
      MedicalCenter & {
        isFavorite: boolean;
        rating: string;
        reviewsCount: string;
      }
      //@ts-expect-error attaches rating, reviewsCount
    >(ALIAS).apply(qbWithFavorite);

    return qbWithFavoriteWithDoctorsReviewsAndRating;
  }
}
