import { compose } from "./compose.ts";
import { RadixTree } from "./radix.ts";
import { Handler, Methods, Middleware } from "./types";
import { getPathWithoutQuery, getQuery, paramsToObject } from "./utils.ts";

export class Router {
  middlewares: Middleware[] = [];
  private tree = new RadixTree();

  handle = async (req: Request, res: Response): Promise<void> => {
    const path = getPathWithoutQuery(req.url);

    const handler = this.tree.search(req.method, path);

    if (!handler) {
      return;
    }

    req.query = paramsToObject(new URLSearchParams(getQuery(req.url)).entries());

    await handler({ req, res }, async () => {});
  };

  prettyPrint(): string {
    return this.tree.prettyPrint();
  }

  addRoute = (method: Methods, path: string, handler: Handler): this => {
    const fn = compose([...this.middlewares, handler]);

    this.tree.insert(method, path, fn);

    return this;
  };

  nest = (path: string, cb: (r: Router) => void): this => {
    const router = new Router();

    router.middlewares = [...this.middlewares];

    cb(router);

    const routes = router.tree.collectRoute();

    for (const route of routes) {
      this.tree.insert(route.method, path + route.path, route.handler);
    }

    return this;
  };

  use = (middleware: Middleware): this => {
    this.middlewares.push(middleware);

    return this;
  };

  get = (path: string, handler: Handler): this => {
    return this.addRoute("GET", path, handler);
  };

  post = (path: string, handler: Handler): this => {
    return this.addRoute("POST", path, handler);
  };

  delete = (path: string, handler: Handler): this => {
    return this.addRoute("DELETE", path, handler);
  };

  patch = (path: string, handler: Handler): this => {
    return this.addRoute("PATCH", path, handler);
  };
}
