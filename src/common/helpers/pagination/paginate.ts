import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export const takePaginated = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  size: number,
) => {
  const skip = (page - 1) * size;

  qb.skip(skip).take(size);
  const [data, count] = await qb.getManyAndCount();

  const lastPage = Math.ceil(count / size);

  return { data, count, page, size, lastPage };
};
