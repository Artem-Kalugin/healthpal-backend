import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

const UNIQUE_VIOLATION = '23505';

/** Ошибка Postgres (код, `constraint`, `table`) из `cause` ошибки запроса Drizzle; `undefined`, если это не она. */
export const getPgError = (error: unknown) =>
  error instanceof DrizzleQueryError && error.cause instanceof DatabaseError
    ? error.cause
    : undefined;

/** Нарушение именно этого unique/pk. */
export const isUniqueViolation = (error: unknown, constraint: string) => {
  const pgError = getPgError(error);

  return (
    pgError?.code === UNIQUE_VIOLATION && pgError.constraint === constraint
  );
};
