import { StatusBodyMap, StatusCode } from "./index.ts";

declare global {
  interface TypedResponse<T = unknown> extends Response {
    status<S extends StatusCode>(
      code: S,
    ): {
      json(body: StatusBodyMap<T>[S]): void;
      send(body: StatusBodyMap<T>[S]): void;
    };
  }

  export interface AppRequest {
    headers: Record<string, string>;
    method: string;
    params: Record<string, string>;
    query: Record<string, string>;
    url: string;
    body?: unknown;
  }

  export interface AppResponse {
    status(code: number): { send(data: unknown): void };
  }

  export interface Context2 {
    req: AppRequest;
    res: AppResponse;
  }

  // interface Context2 {
  //   req: Request;
  //   res: TypedResponse;
  // }
}
