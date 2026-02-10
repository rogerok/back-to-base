import { formatParam, getIndices, isNonNullishPrimitive, isNullish, isObject } from "./helpers.ts";

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
  const prepare = (obj: Record<string, unknown>, prefix?: string): string => {
    const keys = Object.keys(obj).sort();

    return keys
      .reduce<string[]>((acc, key) => {
        const v = obj[key];
        const k = prefix ? getIndices(prefix, key) : key;

        if (Array.isArray(v)) {
          acc.push(...parseArray(v, k));
          return acc;
        }

        if (isObject(v)) {
          acc.push(prepare(v, k));
          return acc;
        }

        if (isNonNullishPrimitive(v) || isNullish(v)) {
          acc.push(formatParam(k, String(v)));
          return acc;
        }

        return acc;
      }, [])
      .join("&");
  };

  return prepare(obj, prefix);
};
