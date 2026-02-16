Добавить валидацию с зод схемой. res.status(200).send({}) должен быть типизированным в зависимости от статуса.
Важно - все методы роутера могут быть выраженны через use (по сути вызов метода-рутера - это отдельная мидлвара).
Сделать роутер "контекстным", те мидлвары срабатывают сверху вниз контекста.
Для внутренней реализации роутинга использовать https://en.wikipedia.org/wiki/Radix_tree (см https://github.com/delvedor/find-my-way/tree/main)

```ts
interface Context {
 req: Request,
 res: Response,
}

// in db-middleware.ts begin
declare ... // через слияние интерфейс Context должен быть расширен
interface Context {
  dataSource: DbInstace
}
// in db-middleware.ts end

type Handler = (ctx: Context, next: Next) => void | ((ctx: Context) => Promise<void>);
export type Next = () => void | Promise<void>;

use(middleware: Middleware, opts?: UseOptions): Router

get(path: string, opts: RouteOptions, handler: Handler): Router
post(path: string, opts: RouteOptions, handler: Handler): Router
patch(path: string, opts: RouteOptions, handler: Handler): Router
delete(path: string, opts: RouteOptions, handler: Handler): Router

const router = new Router()
  .get("/", getHelloHandler)
  .use(loggerMiddleware) // срабатывает для всех вложенных тоже
  .nest("/api", (r) => r.get("/test").use(dbMiddleware)) // dbMiddleware срабатывает только для вложенных

router.prettyPrint()
// └── / — пример, не прям так
//     ├── test (GET)
//     │   ├── /hello (GET)
//     │   └── ing (GET)
//     │       └── /
//     │           └── :param (GET)
//     └── update (PUT)

```
