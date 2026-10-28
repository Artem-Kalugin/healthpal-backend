import { Specification } from 'src/common/helpers/base.specification';
import { MedicalCenter } from 'src/entities/medical-center.entity';
import { SelectQueryBuilder } from 'typeorm';

export class WithDistance<T extends MedicalCenter> implements Specification<T> {
  constructor(
    private readonly alias: string,
    private readonly lat: number,
    private readonly lon: number,
  ) {}

  apply(qb: SelectQueryBuilder<T>) {
    const formula = `
    6371 * acos(LEAST(1, GREATEST(-1,
      cos(radians(:lat)) * cos(radians(${this.alias}.lat)) *
      cos(radians(${this.alias}.lon) - radians(:lon)) +
      sin(radians(:lat)) * sin(radians(${this.alias}.lat))
    )))::numeric
  `;

    qb.addSelect(`ROUND(${formula}, 1)`, 'distance').setParameters({
      lat: this.lat,
      lon: this.lon,
    });

    return qb;
  }
}
