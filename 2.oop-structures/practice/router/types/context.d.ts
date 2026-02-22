import { ParamsType } from "./index.ts";
import { StatusBodyMap, StatusCode } from "./status.ts";

declare global {
  interface TypedResponse<T = unknown> {
    status(code: StatusCode<T>): {
      json(body: StatusBodyMap<T>[StatusCode<T>]): void;
      send(body: StatusBodyMap<T>[StatusCode<T>]): void;
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
