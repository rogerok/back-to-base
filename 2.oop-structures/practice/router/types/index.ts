export type TPath = string;
export type Methods = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
export type MapKeyType = `${Methods}:/${TPath}`;
export type Next = () => Promise<void>;
export type Handler = (ctx: Context, next: Next) => (ctx: Context) => Promise<void>;
export type Middleware = (req: Request, res: Response, next: Next) => Promise<void>;

export type ObjectValues<T> = T[keyof T];
