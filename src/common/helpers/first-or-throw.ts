export const firstOrThrow = <T>(rows: T[], createError: () => Error): T => {
  if (rows.length === 0) throw createError();

  return rows[0];
};
