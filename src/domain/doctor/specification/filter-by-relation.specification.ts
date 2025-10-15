import { ManyToOneJoinOptions } from 'declarations';
import { Specification } from 'src/common/helpers/base.specification';
import { Doctor } from 'src/entities/doctor.entity';
import { SelectQueryBuilder } from 'typeorm';

export class FilterByRelation implements Specification<Doctor> {
  constructor(
    private readonly alias: string,
    private readonly filterBy: string | number,
    private readonly meta: ManyToOneJoinOptions,
  ) {}

  apply(qb: SelectQueryBuilder<Doctor>) {
    const parameterName = `${this.meta.name}Filter`;

    return qb.andWhere(`${this.alias}.${this.meta.name} = :${parameterName}`, {
      [parameterName]: this.filterBy,
    });
  }
}
