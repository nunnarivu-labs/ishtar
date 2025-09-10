const PDF_TYPE = 'application/pdf';
const IMG_REGEX = /^image\/.+$/;

export const isImage = (type: string) => IMG_REGEX.test(type);

export const isDocument = (type: string) => type === PDF_TYPE;

export const isAllowedType = (type: string) =>
  isImage(type) || isDocument(type);
