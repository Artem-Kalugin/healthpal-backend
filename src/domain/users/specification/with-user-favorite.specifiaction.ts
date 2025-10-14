import { MinimalManyToManyJoinOptions } from 'declarations';
import { Specification } from 'src/common/types/base.specification';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { SelectQueryBuilder } from 'typeorm';

export class WithUserFavoriteSpec implements Specification<MedicalCenter> {
  constructor(
    private readonly userFavoriteMeta: MinimalManyToManyJoinOptions,
    private readonly alias: string,
    private readonly isFavoriteKey: string,
    private readonly userId: string,
  ) {}

  apply(qb: SelectQueryBuilder<MedicalCenter>) {
    const { name, joinColumn, inverseJoinColumn } = this.userFavoriteMeta;

    return qb
      .leftJoin(
        name,
        't',
        `t.${joinColumn.name} = ${this.alias}.id AND t.${inverseJoinColumn.name} = :userId`,
        { userId: this.userId },
      )
      .addSelect(
        `CASE WHEN t.${inverseJoinColumn.name} IS NOT NULL THEN true ELSE false END`,
        this.isFavoriteKey,
      );
  }
}
