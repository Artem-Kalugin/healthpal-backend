import { ManyToManyJoinOptions } from 'declarations';
import { Specification } from 'src/common/helpers/base.specification';
import { Doctor } from 'src/entities/doctor.entity';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { SelectQueryBuilder } from 'typeorm';

export class WithIsUserFavorite<T extends MedicalCenter | Doctor>
  implements Specification<T>
{
  constructor(
    private readonly userFavoriteMeta: ManyToManyJoinOptions,
    private readonly alias: string,
    private readonly isFavoriteKey: string,
    private readonly userId: string,
  ) {}

  apply(qb: SelectQueryBuilder<T>) {
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
