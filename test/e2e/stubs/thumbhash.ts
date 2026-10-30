// `thumbhash` ships as ESM, Jest (CommonJS) does not load it. Image
// processing does not take part in the e2e tests, so the package is replaced with a stub.
export const rgbaToThumbHash = () => new Uint8Array();
