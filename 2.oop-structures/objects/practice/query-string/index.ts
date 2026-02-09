const isFirstIdx = (idx: number): boolean => idx === 0;
const addAmpersand = (str: string): string => `&${str}`;
const makeKey = (idx: number, key: string): string =>
  idx === 0 ? `${key}=` : `${addAmpersand(key)}=`;

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

    acc += isFirstIdx(idx)
      ? `${objKey}[${key}]=${String(v)}`
      : addAmpersand(`${objKey}[${key}]=${String(v)}`);

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

    if (Array.isArray(v)) {
      acc += isFirstIdx(idx) ? parseArray(key, v) : addAmpersand(parseArray(key, v));
      return acc;
    }

    if (isObject(v)) {
      const parsedObj = parseObject(key, v);
      acc += isFirstIdx(idx) ? parsedObj : addAmpersand(parsedObj);
      return acc;
    }

    acc += `${makeKey(idx, key)}${String(v)}`;
    return acc;
  }, "");
};
