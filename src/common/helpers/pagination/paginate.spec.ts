import { SelectQueryBuilder } from 'typeorm';
import {
  getPaginatedUsingLimitOffest,
  getPaginatedUsingSkipTake,
} from './paginate';

const createQb = (count: number) => {
  const rawAndEntities = { raw: [], entities: [] };
  const qb = {
    clone: jest.fn(),
    getCount: jest.fn().mockResolvedValue(count),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawAndEntities: jest.fn().mockResolvedValue(rawAndEntities),
  };
  // count считается на клоне, чтобы skip/take не влияли на COUNT
  const countQb = { getCount: qb.getCount };

  qb.clone.mockReturnValue(countQb);

  return {
    qb: qb as unknown as SelectQueryBuilder<object>,
    mocks: qb,
    rawAndEntities,
  };
};

describe.each([
  {
    name: 'getPaginatedUsingSkipTake',
    paginate: getPaginatedUsingSkipTake,
    skipMethod: 'skip',
    takeMethod: 'take',
  },
  {
    name: 'getPaginatedUsingLimitOffest',
    paginate: getPaginatedUsingLimitOffest,
    skipMethod: 'offset',
    takeMethod: 'limit',
  },
] as const)('$name', ({ paginate, skipMethod, takeMethod }) => {
  it('смещение считается как (page - 1) * size', async () => {
    const { qb, mocks } = createQb(100);

    await paginate(qb, 3, 10);

    expect(mocks[skipMethod]).toHaveBeenCalledWith(20);
    expect(mocks[takeMethod]).toHaveBeenCalledWith(10);
  });

  it('первая страница без смещения', async () => {
    const { qb, mocks } = createQb(100);

    await paginate(qb, 1, 10);

    expect(mocks[skipMethod]).toHaveBeenCalledWith(0);
  });

  it('count считается на клоне, до применения пагинации', async () => {
    const { qb, mocks } = createQb(5);

    await paginate(qb, 2, 2);

    expect(mocks.clone).toHaveBeenCalledTimes(1);
    expect(mocks.clone.mock.invocationCallOrder[0]).toBeLessThan(
      mocks[skipMethod].mock.invocationCallOrder[0],
    );
  });

  it('возвращает данные запроса, count, page, size и lastPage', async () => {
    const { qb, rawAndEntities } = createQb(5);

    const result = await paginate(qb, 2, 2);

    expect(result).toEqual({
      data: rawAndEntities,
      count: 5,
      page: 2,
      size: 2,
      lastPage: 3,
    });
  });

  it.each([
    { count: 0, size: 10, lastPage: 0 },
    { count: 1, size: 10, lastPage: 1 },
    { count: 10, size: 10, lastPage: 1 },
    { count: 11, size: 10, lastPage: 2 },
  ])(
    'lastPage = $lastPage при count=$count, size=$size',
    async ({ count, size, lastPage }) => {
      const { qb } = createQb(count);

      const result = await paginate(qb, 1, size);

      expect(result.lastPage).toBe(lastPage);
    },
  );

  it('страница за пределами диапазона: данные запрашиваются, lastPage не меняется', async () => {
    const { qb, mocks } = createQb(5);

    const result = await paginate(qb, 10, 2);

    expect(mocks[skipMethod]).toHaveBeenCalledWith(18);
    expect(result).toMatchObject({ page: 10, count: 5, lastPage: 3 });
  });
});
