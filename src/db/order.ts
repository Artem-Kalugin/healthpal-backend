import { sql, SQL, SQLWrapper } from 'drizzle-orm';

/** `nulls last` in the Drizzle builder can only be set with a raw fragment. */
export const descNullsLast = (expression: SQLWrapper): SQL =>
  sql`${expression} desc nulls last`;
