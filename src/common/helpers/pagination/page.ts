/** Обёртка страницы для запросов на Drizzle: `data` уже вырезан `limit/offset`, `count` — общее число записей. */
export const toPage = <T>(
  data: T[],
  count: number,
  page: number,
  size: number,
) => ({ data, count, page, size, lastPage: Math.ceil(count / size) });

export const offsetOf = (page: number, size: number) => (page - 1) * size;
