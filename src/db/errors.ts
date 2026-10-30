import { DrizzleQueryError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
export const CHECK_VIOLATION = '23514';

/** Postgres error (code, `constraint`, `table`) from the `cause` of a Drizzle query error; `undefined` if it is not one. */
export const getPgError = (error: unknown) =>
  error instanceof DrizzleQueryError && error.cause instanceof DatabaseError
    ? error.cause
    : undefined;
