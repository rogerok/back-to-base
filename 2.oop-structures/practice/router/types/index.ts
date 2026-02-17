export type ParamsType = Record<string, string>;

export type TPath = string;
export type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
export type Next = () => Promise<void> | void;

export type Handler = (
  ctx: Context,
  next: Next,
) => ((ctx: Context) => Promise<void>) | Promise<void> | void;
//
// export type TypedHandler<TOptions extends RouteOptions> = (
//   ctx: {
//     body: TOptions["body"] extends z.ZodType ? z.infer<TOptions["body"]> : object;
//   } & Omit<Context, "body">,
//   next: Next,
// ) => ((ctx: Context) => Promise<void>) | Promise<void> | void;

export type Middleware = Handler;

export type ObjectValues<T> = T[keyof T];
