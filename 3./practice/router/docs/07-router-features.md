# Router: middleware, nesting, validation

> Предыдущий гайд (06) дал тебе работающий RadixTree.
> Этот гайд собирает полноценный Router поверх него:
> middleware с snapshot-семантикой, вложенные роутеры, Zod-валидация,
> типизированный response.
>
> **Правило**: каждая итерация — рабочий роутер. Тесты зелёные — идёшь дальше.

---

## Оглавление

- [Как пользоваться](#как-пользоваться)
- [Что уже есть](#что-уже-есть)
- [Итерация 1: Router + RadixTree — базовая интеграция](#итерация-1-router--radixtree--базовая-интеграция)
- [Итерация 2: Middleware (use) + snapshot](#итерация-2-middleware-use--snapshot)
- [Итерация 3: Nest — вложенные роутеры](#итерация-3-nest--вложенные-роутеры)
- [Итерация 4: Zod-валидация (body, query, params)](#итерация-4-zod-валидация-body-query-params)
- [Итерация 5: Типизированный response](#итерация-5-типизированный-response)
- [Итерация 6: prettyPrint на уровне Router](#итерация-6-prettyprint-на-уровне-router)
- [Шпаргалка](#шпаргалка)

---

## Как пользоваться

1. Создай файл `router/router.ts` — новый Router поверх RadixTree
2. Создай файл `router/router.test.ts` — тесты текущей итерации
3. Запускай: `npx vitest run router/router.test.ts`
4. Когда все тесты зелёные — переходи к следующей итерации

---

## Что уже есть

Не дублируй — импортируй и используй:

| Файл | Что даёт |
|---|---|
| `radix.ts` | `RadixTree` — insert, search, prettyPrint |
| `compose.ts` | `compose(middlewares)` — onion model |
| `handler-storage.ts` | `HandlerStorage` — Map<Methods, Handler> |
| `types/index.ts` | `Handler`, `Middleware`, `Methods`, `Next` |
| `types/context.d.ts` | Глобальные `Request`, `Response`, `Context` |
| `utils.ts` | `getPathWithoutQuery`, `getQuery`, `paramsToObject`, `getPathWithoutLeading` |

---

## Итерация 1: Router + RadixTree — базовая интеграция

**Идея**: Router — это тонкая обёртка над RadixTree. Он принимает `req` и `res`,
парсит URL (отделяет query string), ищет handler в дереве и вызывает его, передавая `ctx`.

**Что нужно реализовать**:
- Класс `Router` с приватным `tree = new RadixTree()`
- Методы `get`, `post`, `patch`, `delete` — каждый вызывает `addRoute(method, path, handler)`
- `addRoute` — вставляет handler в дерево
- `handle(req, res)` — ищет handler, создаёт ctx, вызывает
- Chaining: все методы возвращают `this`

```typescript
// router.test.ts
import { Router } from "./router.ts";

describe("Iter 1: Router + RadixTree", () => {
  it("GET маршрут работает", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.get("/users", handler);

    await router.handle({ method: "GET", url: "/users" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("handler получает ctx с req и res", async () => {
    const handler = vi.fn();
    const router = new Router().get("/test", handler);

    const res = {};
    await router.handle({ method: "GET", url: "/test" }, res);

    const ctx = handler.mock.calls[0][0];
    expect(ctx).toHaveProperty("req");
    expect(ctx).toHaveProperty("res");
    expect(ctx.req.method).toBe("GET");
    expect(ctx.req.url).toBe("/test");
    expect(ctx.res).toBe(res);
  });

  it("query string парсится в ctx.req.query", async () => {
    let query: any;
    const router = new Router().get("/search", (ctx: any) => {
      query = ctx.req.query;
    });

    await router.handle({ method: "GET", url: "/search?q=hello&page=1" }, {});

    expect(query).toEqual({ q: "hello", page: "1" });
  });

  it("URL с query string матчится по path без query", async () => {
    const handler = vi.fn();
    const router = new Router().get("/search", handler);

    await router.handle({ method: "GET", url: "/search?q=test" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("маршруты с общим префиксом оба работают", async () => {
    const calls: string[] = [];

    const router = new Router()
      .get("/test", () => calls.push("test"))
      .get("/testing", () => calls.push("testing"))
      .get("/team", () => calls.push("team"));

    await router.handle({ method: "GET", url: "/test" }, {});
    await router.handle({ method: "GET", url: "/testing" }, {});
    await router.handle({ method: "GET", url: "/team" }, {});

    expect(calls).toEqual(["test", "testing", "team"]);
  });

  it("GET и POST на одном пути — независимы", async () => {
    const calls: string[] = [];

    const router = new Router()
      .get("/items", () => calls.push("get"))
      .post("/items", () => calls.push("post"));

    await router.handle({ method: "GET", url: "/items" }, {});
    await router.handle({ method: "POST", url: "/items" }, {});

    expect(calls).toEqual(["get", "post"]);
  });

  it("все методы возвращают this (chaining)", () => {
    const noop = () => {};
    const router = new Router();

    expect(router.get("/a", noop)).toBe(router);
    expect(router.post("/b", noop)).toBe(router);
    expect(router.patch("/c", noop)).toBe(router);
    expect(router.delete("/d", noop)).toBe(router);
  });

  it("несуществующий путь — не падает", async () => {
    const router = new Router().get("/exists", vi.fn());

    await router.handle({ method: "GET", url: "/nope" }, {});
    // не бросает ошибку
  });

  it("корневой маршрут /", async () => {
    const handler = vi.fn();
    const router = new Router().get("/", handler);

    await router.handle({ method: "GET", url: "/" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

<details>
<summary>Подсказка</summary>

```typescript
import { compose } from "./compose.ts";
import { RadixTree } from "./radix.ts";
import { Handler, Methods, Middleware } from "./types";
import { getPathWithoutQuery, getQuery, paramsToObject } from "./utils.ts";

export class Router {
  private tree = new RadixTree();

  get = (path: string, handler: Handler): this =>
    this.addRoute("GET", path, handler);

  post = (path: string, handler: Handler): this =>
    this.addRoute("POST", path, handler);

  patch = (path: string, handler: Handler): this =>
    this.addRoute("PATCH", path, handler);

  delete = (path: string, handler: Handler): this =>
    this.addRoute("DELETE", path, handler);

  private addRoute(method: Methods, path: string, handler: Handler): this {
    this.tree.insert(method, path, handler);
    return this;
  }

  handle = async (req: any, res: any) => {
    const path = getPathWithoutQuery(req.url);
    const handler = this.tree.search(req.method, path);

    if (!handler) return;

    const queryStr = getQuery(req.url);
    const query = paramsToObject(new URLSearchParams(queryStr).entries());
    const ctx = { req: { ...req, url: path, query }, res };

    await handler(ctx, async () => {});
  };
}
```

Пока без middleware — просто голый handler в дерево.
</details>

---

## Итерация 2: Middleware (use) + snapshot

**Идея**: `router.use(middleware)` добавляет middleware. При регистрации маршрута
делается **snapshot** текущих middleware и они compose'ятся вместе с handler'ом.

Ключевая семантика: middleware, добавленная **после** `.get()`, не применяется к нему.
Это "контекстный" роутер — middleware срабатывают сверху вниз.

```
router
  .use(logger)          // применится к /a и /b
  .get("/a", handlerA)  // compose([logger, handlerA])
  .use(auth)            // применится только к /b
  .get("/b", handlerB)  // compose([logger, auth, handlerB])
```

```typescript
describe("Iter 2: middleware + snapshot", () => {
  it("use() возвращает this", () => {
    const router = new Router();
    expect(router.use(() => {})).toBe(router);
  });

  it("middleware вызывается перед handler'ом", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_ctx: any, next: any) => { order.push("mw"); next(); })
      .get("/a", () => { order.push("a"); });

    await router.handle({ method: "GET", url: "/a" }, {});

    expect(order).toEqual(["mw", "a"]);
  });

  it("middleware срабатывает для всех маршрутов", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_ctx: any, next: any) => { order.push("mw"); next(); })
      .get("/a", () => { order.push("a"); })
      .get("/b", () => { order.push("b"); });

    await router.handle({ method: "GET", url: "/a" }, {});
    await router.handle({ method: "GET", url: "/b" }, {});

    expect(order).toEqual(["mw", "a", "mw", "b"]);
  });

  it("порядок middleware сохраняется (top-down)", async () => {
    const order: number[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push(1); next(); })
      .use((_: any, next: any) => { order.push(2); next(); })
      .use((_: any, next: any) => { order.push(3); next(); })
      .get("/test", () => { order.push(4); });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("snapshot: middleware ПОСЛЕ .get() НЕ применяется к нему", async () => {
    const order: string[] = [];

    const router = new Router()
      .get("/first", () => { order.push("first"); })
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/second", () => { order.push("second"); });

    await router.handle({ method: "GET", url: "/first" }, {});
    await router.handle({ method: "GET", url: "/second" }, {});

    expect(order).toEqual(["first", "mw", "second"]);
  });

  it("без next() цепочка останавливается", async () => {
    const order: string[] = [];

    const router = new Router()
      .use(() => { order.push("blocker"); })
      .get("/test", () => { order.push("handler"); });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual(["blocker"]);
  });

  it("middleware может обогатить ctx", async () => {
    let captured: any;

    const router = new Router()
      .use((ctx: any, next: any) => { ctx.userId = "user-123"; next(); })
      .get("/me", (ctx: any) => { captured = ctx.userId; });

    await router.handle({ method: "GET", url: "/me" }, {});

    expect(captured).toBe("user-123");
  });

  it("onion model: await next()", async () => {
    const order: string[] = [];

    const router = new Router()
      .use(async (_: any, next: any) => {
        order.push("before");
        await next();
        order.push("after");
      })
      .get("/test", () => { order.push("handler"); });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual(["before", "handler", "after"]);
  });

  it("ошибка в middleware пробрасывается", async () => {
    const router = new Router()
      .use(() => { throw new Error("boom"); })
      .get("/test", () => {});

    await expect(
      router.handle({ method: "GET", url: "/test" }, {})
    ).rejects.toThrow("boom");
  });

  it("concurrent requests — разные контексты", async () => {
    let ctx1: any, ctx2: any;

    const router = new Router()
      .use(async (ctx: any, next: any) => { ctx.rid = ctx.req.url; await next(); })
      .get("/a", (ctx: any) => { ctx1 = ctx; })
      .get("/b", (ctx: any) => { ctx2 = ctx; });

    await Promise.all([
      router.handle({ method: "GET", url: "/a" }, {}),
      router.handle({ method: "GET", url: "/b" }, {}),
    ]);

    expect(ctx1.rid).toBe("/a");
    expect(ctx2.rid).toBe("/b");
  });
});
```

<details>
<summary>Подсказка</summary>

Добавь в Router:
```typescript
private middlewares: Middleware[] = [];

use = (middleware: Middleware): this => {
  this.middlewares.push(middleware);
  return this;
};
```

Измени `addRoute`:
```typescript
private addRoute(method: Methods, path: string, handler: Handler): this {
  // snapshot текущих middleware в момент регистрации
  const composed = compose([...this.middlewares, handler]);
  this.tree.insert(method, path, composed);
  return this;
}
```

Ключевой момент: `[...this.middlewares]` — это **копия** массива на момент вызова `.get()`.
Middleware, добавленные позже через `.use()`, не попадут в эту копию.

`handle()` не меняется — в дереве уже лежит composed-функция со всеми middleware.
</details>

---

## Итерация 3: Nest — вложенные роутеры

**Идея**: `router.nest("/api", (r) => { ... })` создаёт дочерний роутер с префиксом.
Middleware родителя наследуются. Middleware дочернего НЕ утекают наружу.

Как это работает:
1. Создаём child Router
2. Копируем текущие middleware родителя в child
3. Вызываем callback — пользователь наполняет child маршрутами
4. Собираем все маршруты из child.tree и вставляем в parent.tree с prefix

```typescript
describe("Iter 3: nest", () => {
  it("nest() возвращает this", () => {
    const router = new Router();
    expect(router.nest("/api", () => {})).toBe(router);
  });

  it("добавляет prefix к вложенным маршрутам", async () => {
    const handler = vi.fn();
    const router = new Router().nest("/api", (r) => r.get("/users", handler));

    await router.handle({ method: "GET", url: "/api/users" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("без prefix — не матчит", async () => {
    const handler = vi.fn();
    const router = new Router().nest("/api", (r) => r.get("/users", handler));

    await router.handle({ method: "GET", url: "/users" }, {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("middleware родителя применяется к вложенным маршрутам", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push("parent"); next(); })
      .nest("/api", (r) =>
        r.get("/data", () => { order.push("handler"); })
      );

    await router.handle({ method: "GET", url: "/api/data" }, {});

    expect(order).toEqual(["parent", "handler"]);
  });

  it("middleware вложенного НЕ утекает наружу", async () => {
    const order: string[] = [];

    const router = new Router()
      .nest("/api", (r) =>
        r
          .use((_: any, next: any) => { order.push("nested-mw"); next(); })
          .get("/data", () => { order.push("data"); })
      )
      .get("/root", () => { order.push("root"); });

    await router.handle({ method: "GET", url: "/root" }, {});
    await router.handle({ method: "GET", url: "/api/data" }, {});

    expect(order).toEqual(["root", "nested-mw", "data"]);
  });

  it("глубокая вложенность", async () => {
    const handler = vi.fn();

    const router = new Router()
      .nest("/api", (r) =>
        r.nest("/v1", (r) =>
          r.nest("/users", (r) =>
            r.get("/list", handler)
          )
        )
      );

    await router.handle({ method: "GET", url: "/api/v1/users/list" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("middleware scope сохраняется через уровни вложенности", async () => {
    const order: string[] = [];

    const logger = (_: any, next: any) => { order.push("log"); next(); };
    const auth = (_: any, next: any) => { order.push("auth"); next(); };
    const db = (_: any, next: any) => { order.push("db"); next(); };

    const router = new Router()
      .use(logger)
      .nest("/api", (r) =>
        r
          .use(auth)
          .get("/public", () => { order.push("public"); })
          .use(db)
          .get("/private", () => { order.push("private"); })
      )
      .get("/health", () => { order.push("health"); });

    await router.handle({ method: "GET", url: "/api/public" }, {});
    expect(order).toEqual(["log", "auth", "public"]);

    order.length = 0;
    await router.handle({ method: "GET", url: "/api/private" }, {});
    expect(order).toEqual(["log", "auth", "db", "private"]);

    order.length = 0;
    await router.handle({ method: "GET", url: "/health" }, {});
    expect(order).toEqual(["log", "health"]);
  });

  it("nest + общий prefix с другими маршрутами", async () => {
    const calls: string[] = [];

    const router = new Router()
      .get("/api/health", () => calls.push("health"))
      .nest("/api", (r) =>
        r.get("/users", () => calls.push("users"))
      );

    await router.handle({ method: "GET", url: "/api/health" }, {});
    await router.handle({ method: "GET", url: "/api/users" }, {});

    expect(calls).toEqual(["health", "users"]);
  });
});
```

<details>
<summary>Подсказка</summary>

Тебе нужно решить проблему: как перенести маршруты из дочернего дерева в родительское
с prefix'ом. Есть два подхода:

**Подход 1 — простой**: дочерний Router не использует своё дерево напрямую.
Вместо этого он записывает маршруты в массив `{ method, path, handler }`,
а nest() потом вставляет их в родительское дерево с prefix'ом.

**Подход 2 — через обход дерева**: дочерний Router строит своё дерево,
потом nest() обходит его рекурсивно, собирает все `(method, fullPath, handler)`,
и вставляет в родительское дерево с prefix.

Подход 1 проще. Добавь в Router:

```typescript
// массив для сбора маршрутов (нужен для nest)
private routes: { method: Methods; path: string; handler: Handler }[] = [];

private addRoute(method: Methods, path: string, handler: Handler): this {
  const composed = compose([...this.middlewares, handler]);
  this.tree.insert(method, path, composed);
  // запомним для nest
  this.routes.push({ method, path, handler: composed });
  return this;
}

nest = (prefix: string, callback: (router: Router) => void): this => {
  const child = new Router();
  // скопировать middleware родителя
  child.middlewares = [...this.middlewares];
  // пользователь наполняет child
  callback(child);
  // перенести маршруты с prefix
  for (const route of child.routes) {
    this.tree.insert(route.method, prefix + route.path, route.handler);
    this.routes.push({ ...route, path: prefix + route.path });
  }
  return this;
};
```

Обрати внимание: child.middlewares **начинает** с копии родительских.
Когда child делает `.use()` — это добавляет только в его массив.
Когда child делает `.get()` — snapshot берётся из его массива (parent + свои).
</details>

---

## Итерация 4: Zod-валидация (body, query, params)

**Идея**: перегрузка метода `.get(path, { schema }, handler)` — второй аргумент
может быть объектом с Zod-схемами. Если есть schema — перед handler'ом вставляется
валидационный middleware, который проверяет `body`, `query` или `params`.
При невалидных данных — `ctx.res.status(400).send({ error: ... })` и цепочка останавливается.

```typescript
import { z } from "zod";

describe("Iter 4: Zod-валидация", () => {
  const createRes = () => {
    const res: any = {
      body: undefined,
      statusCode: 0,
      status(code: number) {
        res.statusCode = code;
        return {
          send(data: any) { res.body = data; },
        };
      },
    };
    return res;
  };

  it("пропускает валидный body", async () => {
    const handler = vi.fn((ctx: any) => ctx.res.status(201).send({ ok: true }));

    const router = new Router().post(
      "/users",
      { schema: { body: z.object({ name: z.string(), age: z.number() }) } },
      handler,
    );

    const res = createRes();
    await router.handle(
      { method: "POST", url: "/users", body: { name: "Alice", age: 30 } },
      res,
    );

    expect(handler).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(201);
  });

  it("отклоняет невалидный body — 400", async () => {
    const handler = vi.fn();

    const router = new Router().post(
      "/users",
      { schema: { body: z.object({ name: z.string() }) } },
      handler,
    );

    const res = createRes();
    await router.handle(
      { method: "POST", url: "/users", body: { name: 123 } },
      res,
    );

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("валидирует query", async () => {
    const handler = vi.fn();

    const router = new Router().get(
      "/items",
      { schema: { query: z.object({ page: z.string() }) } },
      handler,
    );

    const res = createRes();
    await router.handle({ method: "GET", url: "/items" }, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("пропускает валидный query", async () => {
    const handler = vi.fn();

    const router = new Router().get(
      "/items",
      { schema: { query: z.object({ page: z.string() }) } },
      handler,
    );

    await router.handle({ method: "GET", url: "/items?page=1" }, createRes());

    expect(handler).toHaveBeenCalledOnce();
  });

  it("без schema — работает как обычно", async () => {
    const handler = vi.fn();
    const router = new Router().get("/test", handler);

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("schema + middleware вместе", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .post(
        "/users",
        { schema: { body: z.object({ name: z.string() }) } },
        () => { order.push("handler"); },
      );

    await router.handle(
      { method: "POST", url: "/users", body: { name: "Alice" } },
      createRes(),
    );

    expect(order).toEqual(["mw", "handler"]);
  });
});
```

<details>
<summary>Подсказка</summary>

1. Измени сигнатуру `get/post/...` — второй аргумент может быть opts или handler:
```typescript
get(path: string, handler: Handler): this;
get(path: string, opts: RouteOptions, handler: Handler): this;
get(path: string, optsOrHandler: RouteOptions | Handler, handler?: Handler): this {
  if (typeof optsOrHandler === "function") {
    return this.addRoute("GET", path, optsOrHandler);
  }
  return this.addRoute("GET", path, handler!, optsOrHandler);
}
```

2. Создай валидационный middleware:
```typescript
function createValidationMiddleware(schema: SchemaOptions): Middleware {
  return (ctx: any, next: any) => {
    if (schema.body) {
      const result = schema.body.safeParse(ctx.req.body);
      if (!result.success) {
        ctx.res.status(400).send({ error: result.error.message });
        return; // не вызываем next!
      }
    }
    if (schema.query) {
      const result = schema.query.safeParse(ctx.req.query);
      if (!result.success) {
        ctx.res.status(400).send({ error: result.error.message });
        return;
      }
    }
    return next();
  };
}
```

3. В `addRoute` при наличии opts:
```typescript
const stack = [...this.middlewares];
if (opts?.schema) {
  stack.push(createValidationMiddleware(opts.schema));
}
stack.push(handler);
const composed = compose(stack);
```
</details>

---

## Итерация 5: Типизированный response

**Идея**: `ctx.res.status(200).send(body)` — тип `body` зависит от переданного status code.
У тебя уже есть `StatusBodyMap` в `types/index.ts`. Нужно чтобы Zod-схема response
валидировала ответ, а TypeScript подсказывал тип body.

Response-валидация работает через **перехват send**: middleware оборачивает `res`,
и когда handler вызывает `status(code).send(data)`, перехватчик проверяет data по схеме.

```typescript
import { z } from "zod";

describe("Iter 5: типизированный response", () => {
  const createRes = () => {
    const res: any = {
      body: undefined,
      statusCode: 0,
      status(code: number) {
        res.statusCode = code;
        return {
          send(data: any) { res.body = data; },
        };
      },
    };
    return res;
  };

  it("валидный response — проходит", async () => {
    const router = new Router().get(
      "/user",
      {
        schema: {
          response: { 200: z.object({ id: z.number(), name: z.string() }) },
        },
      },
      (ctx: any) => {
        ctx.res.status(200).send({ id: 1, name: "Alice" });
      },
    );

    const res = createRes();
    await router.handle({ method: "GET", url: "/user" }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 1, name: "Alice" });
  });

  it("невалидный response — бросает ошибку", async () => {
    const router = new Router().get(
      "/user",
      {
        schema: {
          response: { 200: z.object({ id: z.number(), name: z.string() }) },
        },
      },
      (ctx: any) => {
        ctx.res.status(200).send({ id: "bad" }); // id должен быть number
      },
    );

    await expect(
      router.handle({ method: "GET", url: "/user" }, createRes())
    ).rejects.toThrow();
  });

  it("response без схемы для данного status code — пропускает", async () => {
    const router = new Router().get(
      "/user",
      {
        schema: {
          response: { 200: z.object({ id: z.number() }) },
        },
      },
      (ctx: any) => {
        ctx.res.status(201).send({ anything: true }); // 201 нет в schema
      },
    );

    const res = createRes();
    await router.handle({ method: "GET", url: "/user" }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ anything: true });
  });

  it("body + response валидация вместе", async () => {
    const router = new Router().post(
      "/users",
      {
        schema: {
          body: z.object({ name: z.string() }),
          response: { 201: z.object({ id: z.number(), name: z.string() }) },
        },
      },
      (ctx: any) => {
        ctx.res.status(201).send({ id: 1, name: ctx.req.body.name });
      },
    );

    const res = createRes();
    await router.handle(
      { method: "POST", url: "/users", body: { name: "Alice" } },
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 1, name: "Alice" });
  });
});
```

<details>
<summary>Подсказка</summary>

Response-валидация — это middleware, которая **оборачивает res** перед вызовом handler'а:

```typescript
function createResponseValidation(responseSchemas: Record<number, ZodSchema>): Middleware {
  return (ctx: any, next: any) => {
    const originalStatus = ctx.res.status.bind(ctx.res);

    ctx.res.status = (code: number) => {
      const result = originalStatus(code);
      const originalSend = result.send.bind(result);

      result.send = (data: any) => {
        const schema = responseSchemas[code];
        if (schema) {
          const parsed = schema.safeParse(data);
          if (!parsed.success) {
            throw new Error(`Response validation failed: ${parsed.error.message}`);
          }
        }
        return originalSend(data);
      };

      return result;
    };

    return next();
  };
}
```

Эта middleware идёт **перед** handler'ом в compose-стеке. Она подменяет `res.status().send()`
на обёртку, которая проверяет data через Zod. Onion model делает всё остальное.

В `addRoute` стек становится:
```
[...snapshot_mw, validationMw?, responseValidationMw?, handler]
```
</details>

---

## Итерация 6: prettyPrint на уровне Router

**Идея**: `router.prettyPrint()` просто делегирует в `tree.prettyPrint()`.
Проверяем, что всё отображается правильно с учётом middleware и nest.

```typescript
describe("Iter 6: prettyPrint", () => {
  it("показывает структуру маршрутов", () => {
    const router = new Router()
      .get("/api/users", vi.fn())
      .post("/api/users", vi.fn())
      .get("/api/items", vi.fn())
      .get("/health", vi.fn());

    const output = router.prettyPrint();

    expect(output).toContain("api/");
    expect(output).toContain("health");
    expect(output).toContain("GET");
    expect(output).toContain("POST");
  });

  it("показывает вложенные маршруты после nest", () => {
    const router = new Router()
      .nest("/api", (r) =>
        r
          .get("/users", vi.fn())
          .get("/items", vi.fn())
      )
      .get("/health", vi.fn());

    const output = router.prettyPrint();

    expect(output).toContain("api/");
    expect(output).toContain("users");
    expect(output).toContain("items");
    expect(output).toContain("health");
  });

  it("пустой роутер", () => {
    const router = new Router();
    const output = router.prettyPrint();

    expect(output).toBe("root");
  });
});
```

<details>
<summary>Подсказка</summary>

```typescript
prettyPrint = (): string => {
  return this.tree.prettyPrint();
};
```

Одна строка. Всё уже реализовано в RadixTree.
</details>

---

## Шпаргалка

| # | Что делаем | Строк кода | Сложность |
|---|---|---|---|
| 1 | Router + RadixTree базовая интеграция | ~40 | Легко |
| 2 | Middleware (use) + snapshot | ~10 | Средне |
| 3 | Nest — вложенные роутеры | ~20 | **Сложно** |
| 4 | Zod-валидация (body, query) | ~40 | Средне |
| 5 | Типизированный response | ~30 | Средне |
| 6 | prettyPrint | ~3 | Легко |

**Итого**: ~140 строк поверх уже готового RadixTree.

### Что дальше

Когда этот гайд пройден, у тебя есть полноценный роутер с:
- Radix tree для маршрутизации
- Middleware с onion model и snapshot-семантикой
- Вложенные роутеры через nest()
- Zod-валидация входных данных и ответов
- Типизированные response по status code

Следующий шаг — добавить `:param` и `*` wildcard в RadixTree (отдельный гайд).
