import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
export const CHECK_VIOLATION = '23514';

/** Ошибка Postgres (код, `constraint`, `table`) из `cause` ошибки запроса Drizzle; `undefined`, если это не она. */
export const getPgError = (error: unknown) =>
  error instanceof DrizzleQueryError && error.cause instanceof DatabaseError
    ? error.cause
    : undefined;
