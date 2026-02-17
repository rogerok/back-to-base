import { RouteTree } from "./tree.ts";
import { Handler, Methods, Middleware, TPath } from "./types";

interface IRouter {
  basePath: TPath;
  readonly middlewares: Middleware[];

  handle(req: Request, res: Response): Promise<void>;

  use(middleware: Middleware): void;
}

const BasePath = "/";

export class Router implements IRouter {
  basePath: TPath;
  middlewares: Middleware[] = [];
  tree = new RouteTree();

  constructor(basePath: TPath = BasePath) {
    this.basePath = basePath;
  }

  use = (middleware: Middleware): this => {
    this.middlewares.push(middleware);

    return this;
  };

  handle = async (req: Request, res: Response): Promise<void> => {
    let index = 0;

    const ctx: Context = {
      body: {},
      params: {},
      req: req,
      res: res as unknown as TypedResponse,
    };

    const next = async (): Promise<void> => {
      if (this.middlewares.length > index) {
        const middleware = this.middlewares[index];
        index += 1;

        const result = middleware(ctx, next);

        if (typeof result === "function") {
          await result(ctx);
        }
      }
    };

    await next();
  };

  get = (path: string, handler: Handler): this => {
    return this.addRoute("GET", path, handler);
  };

  post = (path: string, handler: Handler): this => {
    return this.addRoute("POST", path, handler);
  };

  put = (path: string, handler: Handler): this => {
    return this.addRoute("PUT", path, handler);
  };

  patch = (path: string, handler: Handler): this => {
    return this.addRoute("PATCH", path, handler);
  };

  delete = (path: string, handler: Handler): this => {
    return this.addRoute("DELETE", path, handler);
  };

  nest = (path: string, callback: (router: Router) => void): this => {
    const childRouter = new Router(path);

    callback(childRouter);

    return this.use(async (ctx, next) => {
      const url = new URL(ctx.req.url).pathname;

      if (!url.startsWith(path)) {
        return next();
      }

      await childRouter.handle(ctx.req, ctx.res as unknown as Response);
    });
  };

  private addRoute = (method: Methods, path: string, handler: Handler): this => {
    this.tree.insert(method, path, handler);

    return this.use(async (ctx, next) => {
      const url = new URL(ctx.req.url).pathname;
      const relativePath = url.startsWith(this.basePath)
        ? url.slice(this.basePath.length) || "/"
        : url;

      const result = this.tree.search(method, relativePath);

      if (result) {
        ctx.params = result.params;

        const handlerResult = result.handler(ctx, next);

        if (typeof handlerResult === "function") {
          await handlerResult(ctx);
        } else if (handlerResult instanceof Promise) {
          await handlerResult;
        }

        return;
      }

      await next();
    });
  };
}

const router = new Router();
