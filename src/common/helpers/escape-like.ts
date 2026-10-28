/** Экранирует спецсимволы шаблона `LIKE`/`ILIKE` (`\`, `%`, `_`), чтобы ввод пользователя считался обычным текстом. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
