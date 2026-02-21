import { Handler, Methods, Middleware, Next, TPath } from "./types";

// interface IRouter {
//   basePath: TPath;
//   readonly middlewareMap: MiddlewareMap;
//
//   handle(middleware: Middleware[], req: Request, res: Response): void;
//
//   use(path: TPath, middleware: Middleware): void;
// }

const BasePath = "/";
const GlobalPath = "*";

interface RouteDescriptor {
  stack: Middleware[];
  schema?: unknown;
}

interface RouteOptions {
  handlers: Handler[];
  method: Methods;
  url: TPath;
}

/*
builder pattern
посмотреть в toastify
find-may-way изучить
 */

export class Router {
  basePath: TPath;
  middleware: Middleware[] = [];

  // TODO: this should be a radix tree
  routes: RouteOptions[] = [];

  constructor(basePath: string = BasePath) {
    this.basePath = basePath;
  }

  use(middleware: Middleware): this {
    this.middleware.push(middleware);
    return this;
  }

  match = (method: Methods, url: string): RouteOptions | undefined => {
    return this.routes.find((r) => url === r.url && method === r.method);
  };

  compose = (middlewares: Middleware[]) => {
    return (ctx: Context2, next: Next): Promise<void> => {
      let index = -1;

      const dispatch = (i: number): Promise<void> => {
        if (i <= index) {
          return Promise.reject(new Error("next() called multiple times"));
        }

        index = i;

        const fn: Middleware | Next | undefined = i < middlewares.length ? middlewares[i] : next;

        if (!fn) {
          return Promise.resolve();
        }

        try {
          return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
        } catch (err) {
          return Promise.reject(err);
        }
      };

      return dispatch(0);
    };
  };

  get = (url: string, handler: Handler): this => {
    this.addRoute("GET", url, handler);
    return this;
  };
  post = (url: string, handler: Handler): this => {
    this.addRoute("POST", url, handler);
    return this;
  };
  patch = (url: string, handler: Handler): this => {
    this.addRoute("PATCH", url, handler);
    return this;
  };
  delete = (url: string, handler: Handler): this => {
    this.addRoute("DELETE", url, handler);
    return this;
  };
  put = (url: string, handler: Handler): this => {
    this.addRoute("PUT", url, handler);
    return this;
  };

  handle = async (req: AppRequest, resp: AppResponse) => {
    // TODO: need type
    const route = this.match(req.method as Methods, req.url.split("?")[0]);

    const ctx: Context2 = {
      req: { ...req, params: {}, query: {} },
      res: resp,
    };

    if (!route) {
      // return next();
      return;
    }

    const stack = route.handlers;
    // TOOD: Where i can get next cb?
    await this.compose(stack)(ctx, async () => {});
  };

  addRoute = (method: Methods, url: string, handler: Handler) => {
    this.routes.push({
      handlers: [...this.middleware, handler],
      method: method,
      url: url,
    });
  };

  nest = (url: string, cb: (r: Router) => void) => {
    const router = new Router(url);
  };
}

const router = new Router();
