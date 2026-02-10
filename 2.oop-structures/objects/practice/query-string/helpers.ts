export const isFirstIdx = (idx: number): boolean => idx === 0;
export const addAmpersand = (str: string): string => `&${str}`;
export const formatParamKey = (idx: number, key: string): string =>
  isFirstIdx(idx) ? `${key}=` : `${addAmpersand(key)}=`;

export const formatParam = (key: string, value: string): string => `${key}=${value}`;

export const joinWithAmpersand = (arr: string[]): string => arr.join("&");

export const isNonNullishPrimitive = (v: unknown) => {
  return (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    typeof v === "bigint"
  );
};

export const isNullish = (v: unknown): v is null => v === null;

export const getIndices = (prefix: string, key: string): string => `${prefix}[${key}]`;
export const isObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === "[object Object]";
