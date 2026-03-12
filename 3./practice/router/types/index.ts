export type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
export type Next = () => Promise<void> | void;
export type Handler = (ctx: Context, next: Next) => Promise<void> | void;
export type Middleware = Handler;

export interface StatusBodyMap<T = unknown> {
  200: T;
  201: unknown;
  204: never;
  400: { error: string };
  500: { error: string };
}

export type RequestStatusType = 200 | 201 | 204 | 400 | 500;
