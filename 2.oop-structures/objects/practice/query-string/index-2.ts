const isFirstIdx = (idx: number): boolean => idx === 0;
const addAmpersand = (str: string): string => `&${str}`;
const makeKey = (idx: number, key: string): string =>
  isFirstIdx(idx) ? `${key}=` : `${addAmpersand(key)}=`;

const isNonNullishPrimitive = (v: unknown) => {
  return (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    typeof v === "bigint"
  );
};

const getIndices = (prefix: string, key: string): string => `${prefix}[${key}]`;

const getSortedKeys = (obj: Record<string, unknown>): string[] => Object.keys(obj).sort();

export const isObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === "[object Object]";

const parseArray = (objKey: string, val: unknown[]): string => {
  return val.reduce<string>((acc, v, idx) => {
    const withIndex = getIndices(objKey, String(idx));

    if (isObject(v)) {
      acc += buildQueryString(v, withIndex);
      return acc;
    }

    if (Array.isArray(v)) {
      acc += parseArray(withIndex, v);
    }

    acc += `${makeKey(idx, objKey)}${String(v)}`;

    return acc;
  }, "");
};

export const buildQueryString = (obj: Record<string, unknown>, prefix?: string) => {
  const keys = getSortedKeys(obj);

  return keys.reduce((acc, key, idx) => {
    if (obj[key] === undefined) {
      return acc;
    }

    const v = obj[key];

    let queryString = prefix ? makeKey(idx, getIndices(prefix, key)) : makeKey(idx, key);

    if (Array.isArray(v)) {
      queryString = isFirstIdx(idx) ? parseArray(key, v) : addAmpersand(parseArray(key, v));
    }

    if (isObject(v)) {
      const parsedObj = buildQueryString(v, key);
      queryString = isFirstIdx(idx) ? parsedObj : addAmpersand(parsedObj);
    }

    if (v instanceof Date) {
      queryString += v.toISOString();
    }

    if (isNonNullishPrimitive(v)) {
      queryString += String(v);
    }

    acc += queryString;

    return acc;
  }, "");
};
