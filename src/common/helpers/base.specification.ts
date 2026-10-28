import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface Specification<T extends ObjectLiteral> {
  apply(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T>;
}

export abstract class CompositeSpecification<
  T extends ObjectLiteral,
> implements Specification<T> {
  private readonly specs: Specification<T>[] = [];

  apply(qb: SelectQueryBuilder<T>) {
    return this.specs.reduce(
      (accumulator, spec) => spec.apply(accumulator),
      qb,
    );
  }

  and(spec: Specification<T>) {
    this.specs.push(spec);
    return this;
  }
}
