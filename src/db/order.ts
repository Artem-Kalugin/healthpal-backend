import { sql, SQL, SQLWrapper } from 'drizzle-orm';

/** `nulls last` в билдере Drizzle задаётся только сырым фрагментом. */
export const descNullsLast = (expression: SQLWrapper): SQL =>
  sql`${expression} desc nulls last`;
