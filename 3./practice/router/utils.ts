import { URLSearchParamsIterator } from "node:url";

export const paramsToObject = (entries: URLSearchParamsIterator<[string, string]>) => {
  const result = {};
  for (const [key, value] of entries) {
    // @ts-ignore
    result[key] = value;
  }
  return result;
};

export const getPathWithoutQuery = (path: string): string => {
  return path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
};

export const getQuery = (path: string): string => {
  return path.slice(path.indexOf("?"));
};
