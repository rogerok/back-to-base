type Request = Record<string, any>;
type Response = Record<string, any>;

type TPath = string;

type Next = () => void;

type Middleware = (req: Request, res: Response, next: Next) => void;

type MiddlewareMap = {
  [key: TPath]: Middleware[] | undefined;
};

interface IRouter {
  basePath: TPath;
  readonly middlewareMap: MiddlewareMap;

  handle(path: TPath, req: Request, res: Response): void;

  use(path: TPath, middleware: Middleware): void;
}

const BasePath = "/";

// TODO: how to implement handling middlewares for all routes?
const AllPath = "*";

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

  handle = (path: string, req: Request, res: Response): void => {
    let counter = 0;
    const middlewares = this.middlewareMap[path];
    const allRoutesMiddlewares = this.middlewareMap[AllPath];

    const next = (): void => {
      counter += 1;
      go();
    };

    const go = (): void => {
      if (allRoutesMiddlewares && allRoutesMiddlewares.length > counter) {
        allRoutesMiddlewares[counter]?.(req, res, next);
      }
      if (middlewares && middlewares.length > counter) {
        middlewares[counter]?.(req, res, next);
      }
    };

    go();
  };

  get = (path: string, req: Request, res: Response): void => {
    this.handle(path, req, res);
  };
}

const router = new Router();

router.use("*", (_: Request, __: Response, next: Next) => {
  console.log("start first");
  next();
  console.log("end first");
});

router.use("/", (_: Request, __: Response, next: Next) => {
  console.log("start second");
  next();
  console.log("end second");
});

router.get("/", {}, {});
