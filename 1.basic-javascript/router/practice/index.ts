export type Request = Record<string, unknown>;
export type Response = Record<string, unknown>;

type TPath = string;

export type Next = () => void;

type Middleware = (req: Request, res: Response, next: Next) => void;

type MiddlewareMap = {
  [key: TPath]: Middleware[] | undefined;
};

interface IRouter {
  basePath: TPath;
  readonly middlewareMap: MiddlewareMap;

  handle(middleware: Middleware[], req: Request, res: Response): void;

  use(path: TPath, middleware: Middleware): void;
}

const BasePath = "/";
const GlobalPath = "*";

/*
builder pattern
посмотреть в toastify
find-may-way изучить
 */

export class Router implements IRouter {
  basePath: TPath;
  middlewareMap: MiddlewareMap = {};

  constructor(basePath: TPath = BasePath) {
    this.basePath = basePath;
  }

  use = (path: TPath = this.basePath, middleware: Middleware): void => {
    if (!this.middlewareMap[path]) {
      this.middlewareMap[path] = [];
    }

    this.middlewareMap[path].push(middleware);
  };

  getMiddlewaresForPath = (path: TPath): Middleware[] => {
    return this.middlewareMap[path] ?? [];
  };

  handle = (middlewares: Middleware[], req: Request, res: Response): void => {
    let index = 0;

    const dispatch = (): void => {
      if (middlewares.length > index) {
        middlewares[index]?.(req, res, next);
      }
    };

    const next = (): void => {
      index += 1;
      dispatch();
    };

    dispatch();
  };

  get = (path: string, req: Request, res: Response): void => {
    const globalMiddlewares = this.getMiddlewaresForPath(GlobalPath).filter(Boolean);
    const currentMiddleware = this.getMiddlewaresForPath(path).filter(Boolean);

    this.handle([...globalMiddlewares, ...currentMiddleware], req, res);
  };
}
