import { SelectQueryBuilder } from 'typeorm';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { Specification } from 'src/common/types/base.specification';

export class WithOrderBy<T extends string, Alias extends string>
  implements Specification<MedicalCenter>
{
  constructor(
    private readonly field: `${Alias}.${keyof MedicalCenter}` | T,
    private readonly direction: 'ASC' | 'DESC',
  ) {}

  apply(qb: SelectQueryBuilder<MedicalCenter>) {
    qb.addOrderBy(`${this.field}`, this.direction);
    return qb;
  }
}
