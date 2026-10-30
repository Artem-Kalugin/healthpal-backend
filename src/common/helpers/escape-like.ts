/** Escapes the special characters of a `LIKE`/`ILIKE` pattern (`\`, `%`, `_`) so user input is treated as plain text. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
