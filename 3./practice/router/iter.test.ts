import { Router } from "./index.ts";

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
