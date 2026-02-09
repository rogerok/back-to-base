import {
  addAmpersand,
  getIndices,
  isFirstIdx,
  isNonNullishPrimitive,
  isObject,
  makeKey,
} from "./helpers.ts";

// TODO: should i use encodeURIComponent?

const parseArray = (val: unknown[], objKey: string): string => {
  return val.reduce<string>((acc, v, idx) => {
    const withIndex = getIndices(objKey, String(idx));

    if (isObject(v)) {
      acc += buildQueryString(v, withIndex);
      return acc;
    }

    if (Array.isArray(v)) {
      acc += parseArray(v, withIndex);
      return acc;
    }

    acc += isFirstIdx(idx) ? `${objKey}=${String(v)}` : `&${objKey}=${String(v)}`;

    return acc;
  }, "");
};

export const buildQueryString = (obj: Record<string, unknown>, prefix?: string): string => {
  const keys = Object.keys(obj).sort();

  return keys.reduce((acc, key, idx) => {
    if (obj[key] === undefined) {
      return acc;
    }

    const v = obj[key];
    const k = prefix ? getIndices(prefix, key) : key;

    if (Array.isArray(v)) {
      acc += isFirstIdx(idx) ? parseArray(v, k) : addAmpersand(parseArray(v, k));
      return acc;
    }

    if (isObject(v)) {
      acc += buildQueryString(v, k);

      return acc;
    }

    if (isNonNullishPrimitive(v)) {
      acc += makeKey(idx, k) + String(v);
      return acc;
    }

    return acc;
  }, "");
};
