import { DrizzleQueryError } from 'drizzle-orm';

const UNIQUE_VIOLATION = '23505';

/** Нарушение именно этого unique/pk: код Postgres и `constraint` лежат в `cause` ошибки драйвера. */
export const isUniqueViolation = (error: unknown, constraint: string) => {
  if (!(error instanceof DrizzleQueryError)) return false;

  const cause = error.cause as { code?: string; constraint?: string };

  return cause.code === UNIQUE_VIOLATION && cause.constraint === constraint;
};
