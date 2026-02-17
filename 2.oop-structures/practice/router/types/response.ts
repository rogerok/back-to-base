import { StatusBodyMap, StatusCode } from "./status";

export interface TypedResponse<T = unknown> {
  status<S extends StatusCode>(
    code: S,
  ): {
    json(body: StatusBodyMap<T>[S]): void;
    send(body: StatusBodyMap<T>[S]): void;
  };
}
