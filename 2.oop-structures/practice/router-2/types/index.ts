export type ParamsType = Record<string, string>;

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

export type StatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;

export type Finalizer = (ctx: Context2) => Promise<void>;

// export type Handler = (ctx: Context, next: Next) => Finalizer | Promise<void> | void;
export type Handler = (ctx: Context2, next: Next) => Promise<void> | void;
export type Next = () => Promise<void>;

// export type TPath = string;

export type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type Middleware = Handler;

export type ObjectValues<T> = T[keyof T];
