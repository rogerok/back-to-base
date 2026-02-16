import { HandlerStorage } from "./handler-storage.ts";
import { Handler, MapKeyType, Methods, Middleware, TPath } from "./types";

interface IRouter {
  basePath: TPath;
  readonly middlewares: Middleware[];

  handle(req: Request, res: Response): Promise<void>;

  use(middleware: Middleware): void;
}

const BasePath = "/";

/*
builder pattern
посмотреть в toastify
find-may-way изучить
 */

export class Router implements IRouter {
  basePath: TPath;
  middlewares: Middleware[] = [];

  handlers = new HandlerStorage();

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
      req: req,
      res: res,
    };

    const dispatch = async (): Promise<void> => {
      if (this.middlewares.length > index) {
        await this.middlewares[index]?.(req, res, next);
      }
    };

    const next = async (): Promise<void> => {
      index += 1;
      await dispatch();
    };

    await dispatch();
  };

  makeHandlerKey = (path: string, method: Methods): MapKeyType => {
    return `${method}:/${path}`;
  };

  get = (path: string, handler: Handler): this => {
    this.handlers.addHandler(handler, this.makeHandlerKey(path, "GET"));

    return this;
  };

  post = (path: string, handler: Handler): this => {
    this.handlers.addHandler(handler, this.makeHandlerKey(path, "POST"));

    return this;
  };

  put = (path: string, handler: Handler): this => {
    this.handlers.addHandler(handler, this.makeHandlerKey(path, "PUT"));

    return this;
  };

  patch = (path: string, handler: Handler): this => {
    this.handlers.addHandler(handler, this.makeHandlerKey(path, "PATCH"));

    return this;
  };
}

const router = new Router();
