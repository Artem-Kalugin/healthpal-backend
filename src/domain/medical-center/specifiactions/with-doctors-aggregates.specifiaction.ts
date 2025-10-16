import { SelectQueryBuilder } from 'typeorm';
import { Specification } from 'src/common/helpers/base.specification';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { Doctor } from 'src/entities/doctor.entity';

export class WithDoctorsAggregates<T extends MedicalCenter>
  implements Specification<T>
{
  constructor(private readonly alias: string) {}

  apply(qb: SelectQueryBuilder<T>) {
    const doctorAlias = 'doctor';

    qb.leftJoin(
      Doctor,
      doctorAlias,
      `${doctorAlias}."medicalCenterId" = ${this.alias}.id`,
    );

    qb.addSelect(
      `COALESCE(SUM(${doctorAlias}."reviewsCount"), 0)`,
      'reviewsCount',
    );

    qb.addSelect(
      `CASE 
        WHEN SUM(${doctorAlias}."reviewsCount") > 0 
        THEN ROUND(SUM(${doctorAlias}."rating" * ${doctorAlias}."reviewsCount") / SUM(${doctorAlias}."reviewsCount"), 2)
        ELSE NULL
      END`,
      'rating',
    );

    qb.groupBy(`${this.alias}.id`);

    return qb;
  }
}
