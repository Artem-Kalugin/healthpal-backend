import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export const getPaginatedUsingSkipTake = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  size: number,
) => {
  const skip = (page - 1) * size;

  const count = await qb.clone().getCount();

  qb.skip(skip).take(size);

  const data = await qb.getRawAndEntities();

  const lastPage = Math.ceil(count / size);

  return { data, count, page, size, lastPage };
};

export const getPaginatedUsingLimitOffset = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  size: number,
) => {
  const skip = (page - 1) * size;

  const count = await qb.clone().getCount();

  qb.offset(skip).limit(size);

  const data = await qb.getRawAndEntities();

  const lastPage = Math.ceil(count / size);

  return { data, count, page, size, lastPage };
};
