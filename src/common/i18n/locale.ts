import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export enum Locale {
  RU = 'ru',
  EN = 'en',
}

/** A translatable text as stored in `jsonb`: every locale is mandatory, which the type enforces on insert. */
export type Localized = Record<Locale, string>;

/** Column text in the request locale. */
export const localized = (column: SQLWrapper, locale: Locale): SQL<string> =>
  sql<string>`(${column} ->> ${locale}::text)`;
