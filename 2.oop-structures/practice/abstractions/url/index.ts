// Immutable version

type URLWritableKeys = keyof Omit<URL, "origin" | "search" | "searchParams" | "toJSON">;
type URLStringKeys = keyof Omit<URL, "searchParams" | "toJSON">;

// helpers
const changeUrlField = (key: URLWritableKeys, value: string, url: URL): URL => {
  const u = new URL(url);
  u[key] = value;
  return u;
};

const getUrlField = (key: URLStringKeys, url: URL): string => url[key];

// main
export const make = (url: string): URL => new URL(url);
export const toString = (url: URL): string => String(url);

// protocol
export const getProtocol = (url: URL): string => getUrlField("protocol", url);
export const setProtocol = (url: URL, protocol: string): URL =>
  changeUrlField("protocol", protocol, url);

// host
export const getHost = (url: URL): string => getUrlField("host", url);
export const setHost = (url: URL, host: string): URL => changeUrlField("host", host, url);

// path
export const getPath = (url: URL): string => getUrlField("pathname", url);
export const setPath = (url: URL, host: string): URL => changeUrlField("pathname", host, url);

// params
export const setQueryParam = (url: URL, key: string, value: string): URL => {
  const u = make(toString(url));
  u.searchParams.set(key, value);
  return u;
};

export const getQueryParam = (
  url: URL,
  paramName: string,
  defaultValue: string | null = null,
): string | null => url.searchParams.get(paramName) ?? defaultValue;
