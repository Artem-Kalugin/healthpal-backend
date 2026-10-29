import { getTableColumns } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';

/** Все колонки таблицы, кроме перечисленных: для `select`, где нужны почти все поля. */
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
