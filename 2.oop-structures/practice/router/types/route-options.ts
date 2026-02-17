import { z, ZodUnknown } from "zod";

import { StatusCode } from "./status.ts";

export interface RouteOptions<
  TBody extends z.ZodType = ZodUnknown,
  TResponse extends Partial<Record<StatusCode, z.ZodType>> = object,
> {
  query: z.ZodType;
  body?: TBody;
  response?: TResponse;
}
