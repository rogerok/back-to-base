// router.test.ts
import { Router } from "./index.ts";

describe("Iter 2: middleware + snapshot", () => {
  it("use() возвращает this", () => {
    const router = new Router();
    expect(router.use(() => {})).toBe(router);
  });

  it("middleware вызывается перед handler'ом", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_ctx: any, next: any) => {
        order.push("mw");
        next();
      })
      .get("/a", () => {
        order.push("a");
      });

    await router.handle({ method: "GET", url: "/a" }, {});

    expect(order).toEqual(["mw", "a"]);
  });

  it("middleware срабатывает для всех маршрутов", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_ctx: any, next: any) => {
        order.push("mw");
        next();
      })
      .get("/a", () => {
        order.push("a");
      })
      .get("/b", () => {
        order.push("b");
      });

    await router.handle({ method: "GET", url: "/a" }, {});
    await router.handle({ method: "GET", url: "/b" }, {});

    expect(order).toEqual(["mw", "a", "mw", "b"]);
  });

  it("порядок middleware сохраняется (top-down)", async () => {
    const order: number[] = [];

    const router = new Router()
      .use((_: any, next: any) => {
        order.push(1);
        next();
      })
      .use((_: any, next: any) => {
        order.push(2);
        next();
      })
      .use((_: any, next: any) => {
        order.push(3);
        next();
      })
      .get("/test", () => {
        order.push(4);
      });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual([1, 2, 3, 4]);
  });

  it("snapshot: middleware ПОСЛЕ .get() НЕ применяется к нему", async () => {
    const order: string[] = [];

    const router = new Router()
      .get("/first", () => {
        order.push("first");
      })
      .use((_: any, next: any) => {
        order.push("mw");
        next();
      })
      .get("/second", () => {
        order.push("second");
      });

    await router.handle({ method: "GET", url: "/first" }, {});
    await router.handle({ method: "GET", url: "/second" }, {});

    expect(order).toEqual(["first", "mw", "second"]);
  });

  it("без next() цепочка останавливается", async () => {
    const order: string[] = [];

    const router = new Router()
      .use(() => {
        order.push("blocker");
      })
      .get("/test", () => {
        order.push("handler");
      });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual(["blocker"]);
  });

  it("middleware может обогатить ctx", async () => {
    let captured: any;

    const router = new Router()
      .use((ctx: any, next: any) => {
        ctx.userId = "user-123";
        next();
      })
      .get("/me", (ctx: any) => {
        captured = ctx.userId;
      });

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
      .get("/test", () => {
        order.push("handler");
      });

    await router.handle({ method: "GET", url: "/test" }, {});

    expect(order).toEqual(["before", "handler", "after"]);
  });

  it("ошибка в middleware пробрасывается", async () => {
    const router = new Router()
      .use(() => {
        throw new Error("boom");
      })
      .get("/test", () => {});

    await expect(router.handle({ method: "GET", url: "/test" }, {})).rejects.toThrow("boom");
  });

  it("concurrent requests — разные контексты", async () => {
    let ctx1: any, ctx2: any;

    const router = new Router()
      .use(async (ctx: any, next: any) => {
        ctx.rid = ctx.req.url;
        await next();
      })
      .get("/a", (ctx: any) => {
        ctx1 = ctx;
      })
      .get("/b", (ctx: any) => {
        ctx2 = ctx;
      });

    await Promise.all([
      router.handle({ method: "GET", url: "/a" }, {}),
      router.handle({ method: "GET", url: "/b" }, {}),
    ]);

    expect(ctx1.rid).toBe("/a");
    expect(ctx2.rid).toBe("/b");
  });
});

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

    expect(query).toEqual({ page: "1", q: "hello" });
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
