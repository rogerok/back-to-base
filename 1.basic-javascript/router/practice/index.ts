type TPath = string;

type Next = () => void;

// type Middleware = (req: Request, res: Response, next: Next) => Promise<void> | void;
type Middleware = (req: Request, res: Response, next: Next) => void;

type MiddlewareMap = {
  [key: TPath]: Middleware[] | undefined;
};

interface Router {
  handle(req: Request, res: Response): void;

  use(path: string, middleware: Middleware): void;
}

const BasePath = "/";
const AllPath = "*";

export class Router {
  middlewareMap: MiddlewareMap = {};
  basePath: TPath;

  constructor(basePath: TPath = BasePath) {
    this.basePath = basePath;
  }

  use = (path: TPath = this.basePath, middleware: Middleware) => {
    if (!this.middlewareMap[path]) {
      this.middlewareMap[path] = [];
    }

    this.middlewareMap[path].push(middleware);
  };

  handle = (path: string, req: Request, res: Response) => {
    let counter = 0;
    const middlewares = this.middlewareMap[path];

    const next = () => {
      counter += 1;
      go();
    };

    const go = () => {
      if (middlewares && middlewares.length > counter) {
        middlewares[counter]?.(req, res, next);
      }
    };

    go();
  };

  get = (path: string) => {
    // this.handle(path);
  };
}

const router = new Router();

router.use("/", (req: Request, res: Response, next: Next) => {
  console.log("start first");
  next();
  console.log("end first");
});

router.use("/", (req: Request, res: Response, next: Next) => {
  console.log("start second");
  next();
  console.log("end second");
});

router.get("/");
