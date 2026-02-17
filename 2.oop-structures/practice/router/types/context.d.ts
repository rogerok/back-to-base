import { ParamsType } from "./index.ts";
import { StatusBodyMap, StatusCode } from "./status.ts";

declare global {
  interface TypedResponse<T = unknown> {
    status<S extends StatusCode>(
      code: S,
    ): {
      json(body: StatusBodyMap<T>[S]): void;
      send(body: StatusBodyMap<T>[S]): void;
    };
  }

  interface Context {
    body: unknown;
    params: ParamsType;
    req: Request;
    res: TypedResponse;
  }
}

export {};
