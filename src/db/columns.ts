import { getTableColumns } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';

/** All table columns except the listed ones: for a `select` that needs almost all fields. */
export const getTableColumnsExcluding = <
  T extends Table,
  K extends keyof T['_']['columns'],
>(
  table: T,
  excluded: readonly K[],
): Omit<T['_']['columns'], K> => {
  const skipped = new Set<PropertyKey>(excluded);

  return Object.fromEntries(
    Object.entries(getTableColumns(table)).filter(([key]) => !skipped.has(key)),
  ) as Omit<T['_']['columns'], K>;
};
