import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

/**
 * Accent-insensitive text for search (`Müller` -> `Muller`). Wraps the IMMUTABLE `immutable_unaccent` from the
 * `search_extensions` migration, so the same expression can back a trigram index.
 */
export const unaccent = (value: SQLWrapper): SQL<string> =>
  sql<string>`immutable_unaccent(${value})`;

/** `ILIKE` pattern side: the term gets the same normalization as the column. */
export const unaccentedTerm = (term: string): SQL<string> =>
  unaccent(sql`${term}::text`);
