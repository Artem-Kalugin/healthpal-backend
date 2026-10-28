// `thumbhash` поставляется как ESM, Jest (CommonJS) его не грузит. Обработка
// картинок в e2e записей не участвует, поэтому подменяем пакет заглушкой.
export const rgbaToThumbHash = () => new Uint8Array();
