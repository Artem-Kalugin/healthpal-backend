export const offsetOf = (page: number, size: number) => (page - 1) * size;

/**
 * Страница одним запросом: просит у `selectData` на строку больше `size`, лишняя строка говорит, что дальше есть данные.
 * Общее число записей не считается: клиенту нужен только `hasMore`.
 */
export const paginate = async <T>(
  { page, size }: { page: number; size: number },
  selectData: (window: { limit: number; offset: number }) => PromiseLike<T[]>,
) => {
  const rows = await selectData({
    limit: size + 1,
    offset: offsetOf(page, size),
  });

  return { data: rows.slice(0, size), page, size, hasMore: rows.length > size };
};
