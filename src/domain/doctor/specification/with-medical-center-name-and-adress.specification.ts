import { Specification } from 'src/common/helpers/base.specification';
import { Doctor, DoctorRelationKeys } from 'src/entities/doctor.entity';
import { SelectQueryBuilder } from 'typeorm';

export class WithDoctorMedicalCenterNameAndAdress
  implements Specification<Doctor>
{
  constructor(private readonly alias: string) {}

  apply(qb: SelectQueryBuilder<Doctor>) {
    return qb
      .leftJoin(
        `${this.alias}.medicalCenter`,
        DoctorRelationKeys.MEDICAL_CENTER,
      )
      .addSelect([
        `${DoctorRelationKeys.MEDICAL_CENTER}.name`,
        `${DoctorRelationKeys.MEDICAL_CENTER}.address`,
      ]);
  }
}
