const isFirstIdx = (idx: number): boolean => idx === 0;
const addAmpersand = (str: string): string => `&${str}`;
const makeKey = (idx: number, key: string): string =>
  isFirstIdx(idx) ? `${key}=` : `${addAmpersand(key)}=`;

const isNonNullishPrimitive = (v: unknown) => {
  return (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    typeof v === "symbol" ||
    typeof v === "bigint"
  );
};

const getIndices = (prefix: string, key: string): string => `${prefix}[${key}]`;

const getSortedKeys = (obj: Record<string, unknown>): string[] => Object.keys(obj).sort();

export const isObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === "[object Object]";

function parseObject(objKey: string, obj: Record<string, unknown>): string {
  const keys = getSortedKeys(obj);

  return keys.reduce((acc, key, idx) => {
    if (obj[key] === undefined) {
      return acc;
    }

    const v = obj[key];

    if (Array.isArray(v)) {
      acc += isFirstIdx(idx) ? parseArray(key, v) : addAmpersand(parseArray(key, v));
      return acc;
    }

    if (isObject(v)) {
      const withIndex = getIndices(objKey, key);

      acc += `${withIndex}${parseObject(key, v)}`;

      return acc;
    }

    const withIndex = getIndices(objKey, key);

    acc += isFirstIdx(idx)
      ? `${withIndex}=${String(v)}`
      : addAmpersand(`${withIndex}=${String(v)}`);

    return acc;
  }, "");
}

const parseArray = (key: string, val: unknown[]): string => {
  return val.reduce<string>((acc, item, idx) => {
    const k = makeKey(idx, key);

    acc += `${k}${String(item)}`;

    return acc;
  }, "");
};

export const buildQueryString = (obj: Record<string, unknown>) => {
  const keys = getSortedKeys(obj);

  return keys.reduce((acc, key, idx) => {
    if (obj[key] === undefined) {
      return acc;
    }

    const v = obj[key];

    let queryString = "";

    if (Array.isArray(v)) {
      queryString = isFirstIdx(idx) ? parseArray(key, v) : addAmpersand(parseArray(key, v));
    }

    if (isObject(v)) {
      const parsedObj = parseObject(key, v);
      queryString = isFirstIdx(idx) ? parsedObj : addAmpersand(parsedObj);
    }

    if (v instanceof Date) {
      queryString = `${makeKey(idx, key)}${v.toISOString()}`;
    }

    if (isNonNullishPrimitive(v)) {
      acc += `${makeKey(idx, key)}${String(v)}`;
      return acc;
    }

    acc += queryString;

    return acc;
  }, "");
};
