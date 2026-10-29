/** Обёртка страницы для запросов на Drizzle: `data` уже вырезан `limit/offset`, `count` — общее число записей. */
export const toPage = <T>(
  data: T[],
  count: number,
  page: number,
  size: number,
) => ({ data, count, page, size, lastPage: Math.ceil(count / size) });

export const offsetOf = (page: number, size: number) => (page - 1) * size;

/**
 * Страница из двух запросов: данные (получают `limit/offset`) и общее число записей (`total`).
 * Запросы идут параллельно.
 */
export const paginate = async <T>(
  { page, size }: { page: number; size: number },
  selectData: (window: { limit: number; offset: number }) => PromiseLike<T[]>,
  selectTotal: PromiseLike<{ total: number }[]>,
) => {
  const [data, [{ total }]] = await Promise.all([
    selectData({ limit: size, offset: offsetOf(page, size) }),
    selectTotal,
  ]);

  return toPage(data, total, page, size);
};
