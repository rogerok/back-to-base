import { Methods, RequestStatusType, StatusBodyMap } from "./index.ts";

declare global {
  interface Request {
    body: unknown;
    headers: Record<string, string>;
    method: Methods;
    url: string;
    query?: Record<string, string>;
  }

  interface Response {
    status<S extends RequestStatusType>(
      code: S,
    ): {
      return(body: StatusBodyMap[S]): void;
    };
  }

  interface Context {
    req: Request;
    res: Response;
  }
}

export {};
