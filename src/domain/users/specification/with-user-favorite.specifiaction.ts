import { ManyToManyJoinOptions } from 'declarations';
import { Specification } from 'src/common/helpers/base.specification';
import { Doctor } from 'src/entities/doctor.entity';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { SelectQueryBuilder } from 'typeorm';

export const favoritedByUserAtPropertyName = 'favoritedAt';
export const favoritedByUserPropertyName = 'isFavorite';

export class WithIsUserFavorite<T extends MedicalCenter | Doctor>
  implements Specification<T>
{
  constructor(
    private readonly userFavoriteMeta: ManyToManyJoinOptions,
    private readonly alias: string,
    private readonly userId: string,
    private readonly aggregated: boolean,
  ) {}

  apply(qb: SelectQueryBuilder<T>) {
    const { name, joinColumn, inverseJoinColumn } = this.userFavoriteMeta;

    const selectCreatedAtKey = this.aggregated
      ? `(ARRAY_AGG(t."${joinColumn.name}" ORDER BY t."createdAt" DESC))[1]`
      : `t."${joinColumn.name}"`;

    const selectJoinColumnKey = this.aggregated
      ? `BOOL_OR(t."${joinColumn.name}" IS NOT NULL)`
      : `t."${joinColumn.name}" IS NOT NULL`;

    qb.leftJoin(
      name,
      't',
      `t.${joinColumn.name} = ${this.alias}.id AND t.${inverseJoinColumn.name} = :userId`,
      { userId: this.userId },
    )
      .addSelect(selectCreatedAtKey, favoritedByUserAtPropertyName)
      .addSelect(selectJoinColumnKey, favoritedByUserPropertyName);

    return qb;
  }
}
