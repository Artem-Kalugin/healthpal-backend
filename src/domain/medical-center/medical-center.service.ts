import { Inject, Injectable } from '@nestjs/common';
import type { SafeRepository } from 'src/common/helpers/safe-repository.provider';
import { getEntityRepository } from 'src/common/helpers/get-entity-repository';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { UserJoinsStructure, UserRelationKeys } from 'src/entities/user.entity';
import { MedicalCenterResponseFavoritePropertyName } from './dto/medical-center-response.dto';
import { WithIsUserFavorite } from '../users/specification/with-user-favorite.specifiaction';
import { WithDistance } from './specifiactions/with-distance.specification';
import { WithOrderBy } from './specifiactions/with-order-by.specification';
import { mapMedicalCenterWithRaw } from './medical-center.mapper';

const ALIAS = 'center' as const;

const UserFavoriteMeta =
  UserJoinsStructure[UserRelationKeys.FAVORITE_MEDICAL_CENTERS];

@Injectable()
export class MedicalCentersService {
  constructor(
    @Inject(getEntityRepository(MedicalCenter.name))
    private readonly repo: SafeRepository<MedicalCenter>,
  ) {}

  async findWithFavoriteWithDistance(
    userId: string,
    lat: number,
    lon: number,
    top5Only: boolean,
  ): Promise<
    (MedicalCenter & {
      isFavorite: boolean;
      distance?: number;
      walkingTimeMinutes?: number;
    })[]
  > {
    const qb = this.buildBaseQuery(userId);

    new WithDistance(ALIAS, lat, lon).apply(qb);
    new WithOrderBy<'distance', typeof ALIAS>('distance', 'ASC').apply(qb);
    if (top5Only) {
      qb.take(5);
    }

    return mapMedicalCenterWithRaw(await qb.getRawAndEntities());
  }

  async findWithFavoriteByRating(
    userId: string,
    top5Only: boolean,
  ): Promise<
    (MedicalCenter & {
      isFavorite: boolean;
      distance?: number;
      walkingTimeMinutes?: number;
    })[]
  > {
    const qb = this.buildBaseQuery(userId);

    if (top5Only) {
      qb.take(5);
    }

    return mapMedicalCenterWithRaw(await qb.getRawAndEntities());
  }

  private buildBaseQuery(userId: string) {
    const qb = this.repo.createQueryBuilder(ALIAS);

    new WithIsUserFavorite<MedicalCenter>(
      UserFavoriteMeta,
      ALIAS,
      MedicalCenterResponseFavoritePropertyName,
      userId,
    ).apply(qb);

    return qb;
  }
}
