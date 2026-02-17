export interface StatusBodyMap<T = unknown> {
  200: T;
  201: unknown;
  204: never;
  400: { error: string };
  401: { error: string };
  403: { error: string };
  404: { error: string };
  500: { error: string };
}

export type StatusCode<T = unknown> = keyof StatusBodyMap<T>;
