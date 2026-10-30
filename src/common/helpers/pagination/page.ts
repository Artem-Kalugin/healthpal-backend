export const offsetOf = (page: number, size: number) => (page - 1) * size;

/**
 * A page in one query: asks `selectData` for one row more than `size`, the extra row says there is more data.
 * The total count is not computed: the client only needs `hasMore`.
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
