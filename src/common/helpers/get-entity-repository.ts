export const getEntityRepository = (entityName: string) => {
  return `${entityName.toUpperCase()}_REPOSITORY`;
};
