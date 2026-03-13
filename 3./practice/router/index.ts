import { Handler, Methods, Middleware } from "./types";
import { getPathWithoutQuery, getQuery, paramsToObject } from "./utils.ts";

export class Router {
  map = new Map<string, Handler>();

  handle = async (req: Request, res: Response) => {
    const urlParams = new URLSearchParams(getQuery(req.url));
    const entries = urlParams.entries();

    req.query = paramsToObject(entries);

    await this.map.get(`${req.method}:${getPathWithoutQuery(req.url)}`)?.({ req, res });
  };

  addRoute = (method: Methods, path: string, handler: Handler): this => {
    this.map.set(`${method}:${path}`, handler);

    return this;
  };

  use = (middleware: Middleware): this => {
    return this;
  };

  get = (path: string, handler: Handler): this => {
    return this.addRoute("GET", path, handler);
  };

  post = (path: string, handler: Handler) => {
    return this.addRoute("POST", path, handler);
  };

  delete = (path: string, handler: Handler) => {
    return this.addRoute("DELETE", path, handler);
  };

  patch = (path: string, handler: Handler) => {
    return this.addRoute("PATCH", path, handler);
  };
}
