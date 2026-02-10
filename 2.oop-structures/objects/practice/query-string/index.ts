import {
  addAmpersand,
  formatParam,
  formatParamKey,
  getIndices,
  isFirstIdx,
  isNonNullishPrimitive,
  isNullish,
  isObject,
  joinWithAmpersand,
} from "./helpers.ts";

// TODO: should i use encodeURIComponent?

const parseArray = (val: unknown[], objKey: string): string[] => {
  return val.reduce<string[]>((acc, v, idx) => {
    const withIndex = getIndices(objKey, String(idx));

    if (isObject(v)) {
      acc.push(buildQueryString(v, withIndex));
      return acc;
    }

    if (Array.isArray(v)) {
      acc.push(...parseArray(v, withIndex));
      return acc;
    }

    if (isNonNullishPrimitive(v) || isNullish(v)) {
      acc.push(formatParam(objKey, String(v)));
      return acc;
    }

    return acc;
  }, []);
};

export const buildQueryString = (obj: Record<string, unknown>, prefix?: string): string => {
  const keys = Object.keys(obj).sort();

  return keys.reduce((acc, key, idx) => {
    const v = obj[key];
    const k = prefix ? getIndices(prefix, key) : key;

    if (Array.isArray(v)) {
      acc += isFirstIdx(idx)
        ? joinWithAmpersand(parseArray(v, k))
        : addAmpersand(joinWithAmpersand(parseArray(v, k)));
      return acc;
    }

    if (isObject(v)) {
      acc += buildQueryString(v, k);
      return acc;
    }

    if (isNonNullishPrimitive(v) || isNullish(v)) {
      acc += formatParamKey(idx, k) + String(v);
      return acc;
    }

    return acc;
  }, "");
};
