import { Router } from "./undex.iter-2";

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

    expect(params).toEqual({ postId: "99", userId: "1" });
  });

  it("статический маршрут приоритетнее параметрического", async () => {
    const called: string[] = [];

    const router = new Router()
      .get("/users/me", () => {
        called.push("static");
      })
      .get("/users/:id", () => {
        called.push("param");
      });

    await router.handle({ method: "GET", url: "/users/me" }, {});

    expect(called).toEqual(["static"]);
  });

  it("параметр работает вместе с middleware", async () => {
    const order: string[] = [];

    const router = new Router()
      .use((_: any, next: any) => {
        order.push("mw");
        next();
      })
      .get("/items/:id", (ctx: any) => {
        order.push(`item-${ctx.req.params.id}`);
      });

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

describe("Iter 5: middleware", () => {
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

  it("middleware fires for all routes", async () => {
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

  it("snapshot: middleware ПОСЛЕ .get() не применяется к нему", async () => {
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

  it("Koa onion: await next()", async () => {
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
});

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
      status(code: number) {
        res.statusCode = code;
        return {
          send(data: any) {
            res.body = data;
          },
        };
      },
      statusCode: 0,
    };

    await router.handle({ method: "GET", url: "/data" }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 42 });
  });

  it("парсит query string в ctx.req.query", async () => {
    let query: any;
    const router = new Router().get("/search", (ctx: any) => {
      console.log(ctx);
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
});

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
