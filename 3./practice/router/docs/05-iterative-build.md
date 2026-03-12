# Роутер: собираем по кирпичику

> Каждая итерация — рабочий роутер. Ты пишешь код, прогоняешь тесты, и только когда
> всё зелёное — переходишь дальше. Следующая итерация добавляет ровно одну идею.
>
> **Правило**: не подглядывай вперёд. Реши текущий шаг своим умом.

---

## Как пользоваться

1. Создай файл `router/iter.ts` — в нём будет весь код (потом разобьёшь на файлы)
2. Создай файл `router/iter.test.ts` — копируй туда тесты текущей итерации
3. Запускай: `npx vitest run router/iter.test.ts`
4. Когда все тесты зелёные — добавляй тесты следующей итерации

---

## Итерация 1: Map

**Идея**: роутер — это просто `Map<string, Function>`. Ключ — `"GET:/users"`, значение — handler.

**Что нужно реализовать**:
- Класс `Router` с методом `get(path, handler)`
- Метод `handle(req, res)` — находит handler и вызывает его

```typescript
// iter.test.ts
import { Router } from "./iter.ts";

describe("Iter 1: Map", () => {
  it("вызывает handler для зарегистрированного GET-маршрута", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.get("/test", handler);

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("не вызывает handler для незарегистрированного пути", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.get("/exists", handler);

    await router.handle({ method: "GET", url: "/nope" }, {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("матчит корневой путь /", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.get("/", handler);

    await router.handle({ method: "GET", url: "/" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

<details>
<summary>Подсказка (если совсем застрял)</summary>

```
class Router {
  // Map где ключ — "METHOD:path"
  // get(path, handler) — сохраняет в Map
  // handle(req, res) — достаёт из Map по req.method + req.url
}
```

Это буквально 10-15 строк кода.
</details>

---

## Итерация 2: Все HTTP-методы + chaining

**Идея**: добавить `.post()`, `.patch()`, `.delete()`. Каждый метод возвращает `this` для цепочки вызовов.

**Новые тесты** (добавь к предыдущим):

```typescript
describe("Iter 2: методы + chaining", () => {
  it("POST маршрут работает", async () => {
    const handler = vi.fn();
    const router = new Router();
    router.post("/items", handler);

    await router.handle({ method: "POST", url: "/items" }, {});

    expect(handler).toHaveBeenCalledOnce();
  });

  it("GET и POST на одном пути — независимы", async () => {
    const order: string[] = [];
    const router = new Router()
      .get("/items", () => order.push("get"))
      .post("/items", () => order.push("post"));

    await router.handle({ method: "GET", url: "/items" }, {});
    await router.handle({ method: "POST", url: "/items" }, {});

    expect(order).toEqual(["get", "post"]);
  });

  it("не матчит неправильный HTTP-метод", async () => {
    const handler = vi.fn();
    const router = new Router().get("/test", handler);

    await router.handle({ method: "POST", url: "/test" }, {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("все методы возвращают this (chaining)", () => {
    const noop = () => {};
    const router = new Router();

    expect(router.get("/a", noop)).toBe(router);
    expect(router.post("/b", noop)).toBe(router);
    expect(router.patch("/c", noop)).toBe(router);
    expect(router.delete("/d", noop)).toBe(router);
  });
});
```

<details>
<summary>Подсказка</summary>

Все 4 метода делают одно и то же — кладут handler в Map. Можно сделать приватный
`addRoute(method, path, handler)` и вызывать его из каждого публичного метода.
Не забудь `return this`.
</details>

---

## Итерация 3: Context

**Идея**: handler получает не `(req, res)` напрямую, а объект `ctx = { req, res }`.
Также парсим query string из URL.

**Новые тесты**:

```typescript
describe("Iter 3: Context", () => {
  it("handler получает ctx с req и res", async () => {
    const handler = vi.fn();
    const router = new Router().get("/test", handler);

    await router.handle({ method: "GET", url: "/test" }, {});

    const ctx = handler.mock.calls[0][0];
    expect(ctx).toHaveProperty("req");
    expect(ctx).toHaveProperty("res");
  });

  it("ctx.req содержит method и url", async () => {
    let captured: any;
    const router = new Router().get("/hello", (ctx: any) => {
      captured = ctx;
    });

    await router.handle({ method: "GET", url: "/hello" }, {});

    expect(captured.req.method).toBe("GET");
    expect(captured.req.url).toBe("/hello");
  });

  it("ctx.res.status().send() устанавливает код и тело", async () => {
    const router = new Router().get("/data", (ctx: any) => {
      ctx.res.status(201).send({ id: 42 });
    });

    const res = {
      body: undefined as any,
      statusCode: 0,
      status(code: number) {
        res.statusCode = code;
        return {
          send(data: any) {
            res.body = data;
          },
        };
      },
    };

    await router.handle({ method: "GET", url: "/data" }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 42 });
  });

  it("парсит query string в ctx.req.query", async () => {
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
});
```

<details>
<summary>Подсказка</summary>

В `handle()`:
1. Отдели path от query: `url.split("?")`
2. Ищи handler по path (без query)
3. Распарси query через `new URLSearchParams(queryString)`
4. Создай `ctx = { req: { ...req, query, url: path }, res }`
5. Вызови `handler(ctx)`
</details>

---

## Итерация 4: compose()

**Идея**: написать функцию `compose` **отдельно** от роутера. Она берёт массив функций
и возвращает одну функцию, которая вызывает их по цепочке через `next()`.

Это ключевой кирпичик. Без него не будет middleware.

**Новые тесты** (это отдельный describe, compose не зависит от Router):

```typescript
// Можно в том же файле или в отдельном compose.test.ts
describe("Iter 4: compose", () => {
  // импортируй compose из iter.ts (или compose.ts)

  it("вызывает одну функцию", async () => {
    const fn = vi.fn((_ctx: any, next: any) => next());
    const composed = compose([fn]);

    await composed({});

    expect(fn).toHaveBeenCalledOnce();
  });

  it("вызывает функции по порядку", async () => {
    const order: number[] = [];

    const composed = compose([
      (_ctx: any, next: any) => { order.push(1); return next(); },
      (_ctx: any, next: any) => { order.push(2); return next(); },
      (_ctx: any, next: any) => { order.push(3); },
    ]);

    await composed({});

    expect(order).toEqual([1, 2, 3]);
  });

  it("без next() цепочка останавливается", async () => {
    const order: string[] = [];

    const composed = compose([
      (_ctx: any) => { order.push("blocker"); /* нет next! */ },
      (_ctx: any) => { order.push("never"); },
    ]);

    await composed({});

    expect(order).toEqual(["blocker"]);
  });

  it("onion model: await next() ждёт нижестоящих", async () => {
    const order: string[] = [];

    const composed = compose([
      async (_ctx: any, next: any) => {
        order.push("in-1");
        await next();
        order.push("out-1");
      },
      async (_ctx: any, next: any) => {
        order.push("in-2");
        await next();
        order.push("out-2");
      },
      (_ctx: any) => {
        order.push("handler");
      },
    ]);

    await composed({});

    expect(order).toEqual(["in-1", "in-2", "handler", "out-2", "out-1"]);
  });

  it("все функции получают один и тот же ctx", async () => {
    const ctxs: any[] = [];

    const composed = compose([
      (ctx: any, next: any) => { ctxs.push(ctx); return next(); },
      (ctx: any, next: any) => { ctxs.push(ctx); return next(); },
    ]);

    const ctx = { id: 1 };
    await composed(ctx);

    expect(ctxs[0]).toBe(ctx);
    expect(ctxs[1]).toBe(ctx);
  });

  it("ошибка в middleware пробрасывается наверх", async () => {
    const composed = compose([
      () => { throw new Error("boom"); },
    ]);

    await expect(composed({})).rejects.toThrow("boom");
  });

  it("пустой массив — ничего не падает", async () => {
    const composed = compose([]);
    await composed({});
  });
});
```

<details>
<summary>Подсказка</summary>

```
function compose(middlewares) {
  return function(ctx) {
    // dispatch(i) вызывает middlewares[i], передавая ей next = () => dispatch(i+1)
    // Если i >= длины массива — всё, конец
    // Оборачивай в Promise.resolve() чтобы работало и с sync, и с async
  }
}
```

Ключ: `fn(ctx, () => dispatch(i + 1))` — вот и весь `next()`.
</details>

---

## Итерация 5: Middleware (use)

**Идея**: добавить `router.use(middleware)`. Middleware — это обычная функция `(ctx, next) => ...`.
При регистрации маршрута делаем **snapshot** текущих middleware и compose'им их с handler'ом.

**Новые тесты**:

```typescript
describe("Iter 5: middleware", () => {
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

  it("middleware fires for all routes", async () => {
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

  it("snapshot: middleware ПОСЛЕ .get() не применяется к нему", async () => {
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

  it("Koa onion: await next()", async () => {
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
});
```

<details>
<summary>Подсказка</summary>

Тебе нужно изменить `addRoute()`:

1. `use(mw)` — просто пушит в массив `this.middlewares`
2. В `addRoute(method, path, handler)`:
   - Делаешь **snapshot**: `const mws = [...this.middlewares]`
   - Compose'ишь: `const fn = compose([...mws, handler])`
   - Кладёшь `fn` в Map вместо голого handler
3. В `handle()` — просто находишь fn и вызываешь `fn(ctx)`

**Ключевой момент**: snapshot через `[...this.middlewares]` делается в момент `.get()`,
а не в момент `.handle()`. Поэтому middleware добавленная после `.get()` не попадёт в его цепочку.
</details>

---

## Итерация 6: Параметры маршрута (простой способ)

**Идея**: поддержать `/users/:id`. Пока без radix tree — просто разбиваем путь на сегменты
и сравниваем по одному. Сегмент начинающийся с `:` — параметр.

**Важно**: тебе нужно изменить способ хранения и поиска маршрутов. Map с точным ключом
больше не подходит — `/users/:id` должен матчить `/users/42`.

**Новые тесты**:

```typescript
describe("Iter 6: параметры", () => {
  it("извлекает один параметр", async () => {
    let params: any;
    const router = new Router().get("/users/:id", (ctx: any) => {
      params = ctx.req.params;
    });

    await router.handle({ method: "GET", url: "/users/42" }, {});

    expect(params).toEqual({ id: "42" });
  });

  it("извлекает несколько параметров", async () => {
    let params: any;
    const router = new Router().get("/users/:userId/posts/:postId", (ctx: any) => {
      params = ctx.req.params;
    });

    await router.handle({ method: "GET", url: "/users/1/posts/99" }, {});

    expect(params).toEqual({ userId: "1", postId: "99" });
  });

  it("статический маршрут приоритетнее параметрического", async () => {
    const called: string[] = [];

    const router = new Router()
      .get("/users/me", () => { called.push("static"); })
      .get("/users/:id", () => { called.push("param"); });

    await router.handle({ method: "GET", url: "/users/me" }, {});

    expect(called).toEqual(["static"]);
  });

  it("параметр работает вместе с middleware", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/items/:id", (ctx: any) => { order.push(`item-${ctx.req.params.id}`); });

    await router.handle({ method: "GET", url: "/items/7" }, {});

    expect(order).toEqual(["mw", "item-7"]);
  });

  it("не матчит если количество сегментов разное", async () => {
    const handler = vi.fn();
    const router = new Router().get("/users/:id", handler);

    await router.handle({ method: "GET", url: "/users" }, {});
    await router.handle({ method: "GET", url: "/users/1/extra" }, {});

    expect(handler).not.toHaveBeenCalled();
  });
});
```

<details>
<summary>Подсказка</summary>

Подход без radix tree:

1. Храни маршруты как массив `{ method, segments, handler }`, где segments —
   путь разбитый по `/` (например `["users", ":id"]`)
2. При `handle()` разбей входящий URL на сегменты и пройдись по массиву маршрутов
3. Для каждого маршрута сравни сегменты один к одному:
   - Если сегмент маршрута начинается с `:` — это параметр, сохрани значение
   - Иначе — сравни строки напрямую
4. Если длины не совпадают — маршрут не подходит
5. Для приоритета: ищи сначала статический match, потом параметрический

Это не самый эффективный способ, но он работает и его легко написать.
</details>

---

## Итерация 7: Radix tree (insert + search)

**Идея**: заменить массив маршрутов на дерево. Это главная структура данных роутера.
Дерево позволяет быстро находить маршруты, разделяя общие префиксы.

Реализуй в отдельном файле/классе `RouteTree` с двумя методами:
- `insert(method, path, handler)`
- `search(method, path) → { handler, params } | null`

**Начни с Node**:
```typescript
// Просто структура данных — без логики
class Node {
  path: string;
  children: Node[] = [];
  handlers: Map<string, Function> = new Map();   // method → handler
  paramName: string | null = null;
  isParametric: boolean = false;
}
```

**Тесты** (тестируем дерево напрямую, без Router):

```typescript
describe("Iter 7: radix tree", () => {
  // импортируй RouteTree

  it("insert и search простого маршрута", () => {
    const tree = new RouteTree();
    const handler = vi.fn();

    tree.insert("GET", "/users", handler);
    const result = tree.search("GET", "/users");

    expect(result).not.toBeNull();
    result!.handler();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("два маршрута без общего префикса", () => {
    const tree = new RouteTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/users", a);
    tree.insert("GET", "/items", b);

    tree.search("GET", "/users")!.handler();
    tree.search("GET", "/items")!.handler();

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("маршруты с общим префиксом (split)", () => {
    const tree = new RouteTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/test", a);
    tree.insert("GET", "/testing", b);

    tree.search("GET", "/test")!.handler();
    tree.search("GET", "/testing")!.handler();

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("не матчит частичный путь", () => {
    const tree = new RouteTree();
    tree.insert("GET", "/test", vi.fn());

    expect(tree.search("GET", "/tes")).toBeNull();
    expect(tree.search("GET", "/testing")).toBeNull();
  });

  it("параметрический маршрут", () => {
    const tree = new RouteTree();
    tree.insert("GET", "/users/:id", vi.fn());

    const result = tree.search("GET", "/users/42");

    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: "42" });
  });

  it("несколько параметров", () => {
    const tree = new RouteTree();
    tree.insert("GET", "/users/:uid/posts/:pid", vi.fn());

    const result = tree.search("GET", "/users/1/posts/99");

    expect(result!.params).toEqual({ uid: "1", pid: "99" });
  });

  it("статический маршрут приоритетнее параметрического", () => {
    const tree = new RouteTree();
    const staticH = vi.fn();
    const paramH = vi.fn();

    tree.insert("GET", "/users/me", staticH);
    tree.insert("GET", "/users/:id", paramH);

    tree.search("GET", "/users/me")!.handler();

    expect(staticH).toHaveBeenCalledOnce();
    expect(paramH).not.toHaveBeenCalled();
  });

  it("разные методы на одном пути", () => {
    const tree = new RouteTree();
    const get = vi.fn();
    const post = vi.fn();

    tree.insert("GET", "/items", get);
    tree.insert("POST", "/items", post);

    tree.search("GET", "/items")!.handler();
    tree.search("POST", "/items")!.handler();

    expect(get).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledOnce();
  });

  it("неизвестный маршрут возвращает null", () => {
    const tree = new RouteTree();
    tree.insert("GET", "/exists", vi.fn());

    expect(tree.search("GET", "/nope")).toBeNull();
  });

  it("trailing slash — разные маршруты", () => {
    const tree = new RouteTree();
    const a = vi.fn();
    const b = vi.fn();

    tree.insert("GET", "/items", a);
    tree.insert("GET", "/items/", b);

    tree.search("GET", "/items")!.handler();
    tree.search("GET", "/items/")!.handler();

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
```

<details>
<summary>Подсказка: структура</summary>

RouteTree имеет `root = new Node()` (пустой корень).

**insert(method, path, handler)**:
1. Убери leading `/`
2. Рекурсивно: для каждого static child ищи общий префикс
   - Префикс == child.path → иди глубже с остатком
   - Префикс < child.path → **split** ноду, потом иди глубже
   - Нет общего префикса → пропусти
3. Если path начинается с `:` → создай parametric ноду
4. Иначе → создай новую static ноду

**search(method, path)**:
1. Убери leading `/`
2. Рекурсивно: сначала проверь static children (приоритет!), потом parametric
   - Static: `path.startsWith(child.path)` → иди глубже с остатком
   - Parametric: возьми всё до следующего `/` как значение параметра → иди глубже

</details>

<details>
<summary>Подсказка: split</summary>

Когда у тебя есть нода `"testing"` и приходит `"test"`:

1. Общий префикс: `"test"` (4 символа)
2. Разбиваем `"testing"` на `"test"` + `"ing"`
3. Создаём новый child с path `"ing"`, переносим ему handlers и children старой ноды
4. Старая нода обрезается до `"test"`, её единственный child = новый `"ing"`

```
До:           После:
  testing[H]    test
                  └── ing[H]
```

</details>

---

## Итерация 8: Интеграция — Router + Tree + Compose

**Идея**: собрать всё вместе. Router использует RouteTree для хранения маршрутов и
compose для middleware. Это момент, когда отдельные кирпичики становятся полным роутером.

**Что нужно сделать**:
1. В `addRoute()`: snapshot middleware + compose с handler → вставить composed в tree
2. В `handle()`: search в tree → создать ctx → вызвать найденный handler

**Тесты** — теперь проверяем что всё работает вместе:

```typescript
describe("Iter 8: интеграция", () => {
  it("middleware + параметры", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/users/:id", (ctx: any) => {
        order.push(`user-${ctx.req.params.id}`);
      });

    await router.handle({ method: "GET", url: "/users/42" }, {});

    expect(order).toEqual(["mw", "user-42"]);
  });

  it("onion + параметры + query", async () => {
    const order: string[] = [];
    let captured: any;

    const router = new Router()
      .use(async (_: any, next: any) => {
        order.push("before");
        await next();
        order.push("after");
      })
      .get("/items/:id", (ctx: any) => {
        order.push("handler");
        captured = { params: ctx.req.params, query: ctx.req.query };
      });

    await router.handle({ method: "GET", url: "/items/5?sort=name" }, {});

    expect(order).toEqual(["before", "handler", "after"]);
    expect(captured.params).toEqual({ id: "5" });
    expect(captured.query).toEqual({ sort: "name" });
  });

  it("shared prefix + разные методы + middleware", async () => {
    const calls: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => { calls.push("mw"); next(); })
      .get("/test", () => calls.push("get-test"))
      .get("/testing", () => calls.push("get-testing"))
      .post("/test", () => calls.push("post-test"));

    await router.handle({ method: "GET", url: "/test" }, {});
    await router.handle({ method: "GET", url: "/testing" }, {});
    await router.handle({ method: "POST", url: "/test" }, {});

    expect(calls).toEqual([
      "mw", "get-test",
      "mw", "get-testing",
      "mw", "post-test",
    ]);
  });

  it("snapshot семантика с tree", async () => {
    const order: string[] = [];

    const router = new Router()
      .get("/first", () => order.push("first"))
      .use((_: any, next: any) => { order.push("mw"); next(); })
      .get("/second", () => order.push("second"));

    await router.handle({ method: "GET", url: "/first" }, {});
    await router.handle({ method: "GET", url: "/second" }, {});

    expect(order).toEqual(["first", "mw", "second"]);
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

  it("пустой роутер — handle не падает", async () => {
    const router = new Router();
    const res = { statusCode: 0 };

    await router.handle({ method: "GET", url: "/anything" }, res);

    expect(res.statusCode).toBe(0);
  });
});
```

<details>
<summary>Подсказка</summary>

В `addRoute()`:
```
const snapshot = [...this.middlewares];
const composed = compose([...snapshot, handler]);
this.tree.insert(method, path, composed);
```

В `handle()`:
```
const [path, queryStr] = req.url.split("?");
const result = this.tree.search(req.method, path);
if (!result) return;
const ctx = { req: { ...req, params: result.params, query: parseQuery(queryStr) }, res };
await result.handler(ctx, async () => {});
```

Handler в дереве — это уже composed функция со всеми middleware внутри.
</details>

---

## Итерация 9: Nesting

**Идея**: `router.nest("/api", (r) => { ... })` создаёт вложенный роутер с префиксом.
Middleware родителя наследуются, middleware вложенного не утекают наружу.

**Новые тесты**:

```typescript
describe("Iter 9: nesting", () => {
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
            r.get("/:id", handler)
          )
        )
      );

    await router.handle({ method: "GET", url: "/api/v1/users/42" }, {});

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
});
```

<details>
<summary>Подсказка</summary>

```
nest(prefix, callback) {
  // 1. Создай child = new Router()
  // 2. Скопируй текущие middleware: child.middlewares = [...this.middlewares]
  // 3. Вызови callback(child) — пользователь наполнит child маршрутами
  // 4. Перенеси маршруты из child.tree в this.tree с prefix
  //    (обойди child.tree рекурсивно, собери все пути + handler'ы,
  //     вставь в this.tree с prefix + path)
  return this;
}
```

Ключевой момент: child получает **копию** родительских middleware. Когда child
добавляет свои use() — они не влияют на родителя. А маршруты child'а уже
contain composed middleware (snapshot делается при .get() в child'е).
</details>

---

## Итерация 10: Zod-валидация

**Идея**: `.get("/path", { schema: { body, params, query, response } }, handler)` —
перегрузка метода, которая добавляет валидационный middleware перед handler'ом.

**Новые тесты**:

```typescript
import { z } from "zod";

describe("Iter 10: Zod-валидация", () => {
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

  it("валидирует params", async () => {
    const handler = vi.fn();

    const router = new Router().get(
      "/users/:id",
      { schema: { params: z.object({ id: z.string().regex(/^\d+$/) }) } },
      handler,
    );

    const res = createRes();
    await router.handle({ method: "GET", url: "/users/abc" }, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("пропускает валидные params", async () => {
    const handler = vi.fn();

    const router = new Router().get(
      "/users/:id",
      { schema: { params: z.object({ id: z.string().regex(/^\d+$/) }) } },
      handler,
    );

    await router.handle({ method: "GET", url: "/users/42" }, createRes());

    expect(handler).toHaveBeenCalledOnce();
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

  it("валидирует response — бросает ошибку при невалидном", async () => {
    const router = new Router().get(
      "/user",
      {
        schema: {
          response: { 200: z.object({ id: z.number(), name: z.string() }) },
        },
      },
      (ctx: any) => {
        ctx.res.status(200).send({ id: "bad" }); // id should be number
      },
    );

    await expect(
      router.handle({ method: "GET", url: "/user" }, createRes())
    ).rejects.toThrow();
  });

  it("пропускает валидный response", async () => {
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
});
```

<details>
<summary>Подсказка</summary>

1. Измени сигнатуру `get/post/...` — второй аргумент может быть `options` или `handler`:
   ```
   get(path, handler)
   get(path, { schema }, handler)
   ```
   Проверяй `typeof secondArg === "function"`.

2. Для body/params/query — создай middleware, которая:
   - Берёт `schema.body.safeParse(ctx.req.body)`
   - Если `!result.success` → `ctx.res.status(400).send({ error: ... })` и **не** вызывает `next()`
   - Иначе → `next()`

3. Для response — создай middleware, которая:
   - Перехватывает `ctx.res.status(code).send(data)`
   - Перед настоящим send проверяет `responseSchema[code].safeParse(data)`
   - Если невалидно → `throw new Error(...)`
   - Эта middleware идёт **перед** handler'ом, но проверка срабатывает **когда handler вызовет send** (onion!)

4. Собери стек: `[...snapshot_mw, validationMw?, responseValidationMw?, handler]` → compose
</details>

---

## Финал: полные тесты

Когда все 10 итераций пройдены — запусти `index.test.ts`. Скорее всего нужно будет
подправить импорты и имена типов (`Context2` в тестах).

Если всё зелёное — поздравляю, ты написал полноценный роутер.

---

## Шпаргалка: что в какой итерации

| # | Что добавляем | Строк кода | Сложность |
|---|---|---|---|
| 1 | Map + get + handle | ~15 | Легко |
| 2 | Все методы + chaining | ~10 | Легко |
| 3 | Context + query parsing | ~15 | Легко |
| 4 | compose() | ~20 | Средне |
| 5 | use() + snapshot | ~15 | Средне |
| 6 | Параметры (без дерева) | ~30 | Средне |
| 7 | Radix tree | ~100 | Сложно |
| 8 | Интеграция всего | ~20 | Средне |
| 9 | Nesting | ~40 | Средне |
| 10 | Zod-валидация | ~50 | Средне |
