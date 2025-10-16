import { SelectQueryBuilder } from 'typeorm';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { Specification } from 'src/common/helpers/base.specification';

export class WithOrderBy<
  T extends string,
  Alias extends string,
  S extends MedicalCenter,
> implements Specification<S>
{
  constructor(
    private readonly field: `${Alias}.${keyof MedicalCenter}` | T,
    private readonly direction: 'ASC' | 'DESC',
  ) {}

  apply(qb: SelectQueryBuilder<S>) {
    qb.addOrderBy(`${this.field}`, this.direction);
    return qb;
  }
}
