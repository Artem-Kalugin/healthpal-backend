import { Specification } from 'src/common/helpers/base.specification';
import { Doctor, DoctorRelationKeys } from 'src/entities/doctor.entity';
import { SelectQueryBuilder } from 'typeorm';

export class WithDoctorCategoryType implements Specification<Doctor> {
  constructor(private readonly alias: string) {}

  apply(qb: SelectQueryBuilder<Doctor>) {
    return qb
      .leftJoin(`${this.alias}.category`, DoctorRelationKeys.CATEGORY)
      .addSelect([`${DoctorRelationKeys.CATEGORY}.type`]);
  }
}
