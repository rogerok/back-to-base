import { StatusBodyMap, StatusCode } from "./index.ts";

declare global {
  interface TypedResponse2<T = unknown> {
    status<S extends StatusCode>(
      code: S,
    ): {
      json(body: StatusBodyMap<T>[S]): void;
      send(body: StatusBodyMap<T>[S]): void;
    };
  }

  interface AppRequest {
    headers: Record<string, string>;
    method: string;
    params: Record<string, string>;
    query: Record<string, string>;
    url: string;
    body?: unknown;
  }

  interface AppResponse {
    status(code: number): { send(data: unknown): void };
  }

  interface Context2 {
    req: AppRequest;
    res: AppResponse;
  }
}
