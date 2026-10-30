import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from './db.module';

export const existsById = async (
  db: Database,
  table: PgTable & { id: PgColumn },
  id: string,
) => {
  const found = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  return found.length > 0;
};
