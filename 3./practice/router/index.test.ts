import { z } from "zod";

import { Router } from "./index.ts";
import { Next } from "./types";

/* ── helpers ─────────────────────────────────────────────── */

const createReq = (method = "GET", url = "/", body?: unknown) => ({
  body,
  headers: {} as Record<string, string>,
  method,
  url,
});

const createRes = () => {
  const res = {
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return {
        send(data: unknown) {
          res.body = data;
        },
      };
    },
    statusCode: 0,
  };
  return res;
};

/* ── tests ───────────────────────────────────────────────── */

describe("Router", () => {
  /* ── chainable API ─────────────────────────────────────── */

  describe("chainable API", () => {
    it("all registration methods return the same router instance", () => {
      const noop = (_ctx: Context2, next: Next) => next();
      const router = new Router();

      expect(router.get("/a", noop)).toBe(router);
      expect(router.post("/b", noop)).toBe(router);
      expect(router.patch("/c", noop)).toBe(router);
      expect(router.delete("/d", noop)).toBe(router);
      expect(router.use(noop)).toBe(router);
      expect(router.nest("/e", () => {})).toBe(router);
    });

    it("supports fluent method chaining", () => {
      const noop = (_ctx: Context2, next: Next) => next();

      const router = new Router()
        .use(noop)
        .get("/", noop)
        .post("/items", noop)
        .nest("/api", (r) => r.get("/test", noop));

      expect(router).toBeInstanceOf(Router);
    });
  });

  /* ── HTTP method routing ───────────────────────────────── */

  describe("HTTP method routing", () => {
    it.each([
      ["GET", "get"],
      ["POST", "post"],
      ["PATCH", "patch"],
      ["DELETE", "delete"],
    ] as const)("matches %s request via .%s()", async (method, routerMethod) => {
      const handler = vi.fn((ctx: Context2) => {
        ctx.res.status(200).send({ ok: true });
      });

      const router = new Router();
      router[routerMethod]("/test", handler);

      const res = createRes();
      await router.handle(createReq(method, "/test"), res);

      expect(handler).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
    });

    it("does not match wrong HTTP method", async () => {
      const handler = vi.fn();
      const router = new Router().get("/test", handler);

      await router.handle(createReq("POST", "/test"), createRes());

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not match unregistered path", async () => {
      const handler = vi.fn();
      const router = new Router().get("/exists", handler);

      await router.handle(createReq("GET", "/nope"), createRes());

      expect(handler).not.toHaveBeenCalled();
    });

    it("matches root path", async () => {
      const handler = vi.fn();
      const router = new Router().get("/", handler);

      await router.handle(createReq("GET", "/"), createRes());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("different methods on the same path are independent", async () => {
      const order: string[] = [];

      const router = new Router()
        .get("/items", () => {
          order.push("get");
        })
        .post("/items", () => {
          order.push("post");
        })
        .delete("/items", () => {
          order.push("delete");
        });

      await router.handle(createReq("GET", "/items"), createRes());
      await router.handle(createReq("POST", "/items"), createRes());
      await router.handle(createReq("DELETE", "/items"), createRes());

      expect(order).toEqual(["get", "post", "delete"]);
    });
  });

  /* ── handler context ───────────────────────────────────── */

  describe("handler context", () => {
    it("handler receives ctx with req and res", async () => {
      const handler = vi.fn();
      const router = new Router().get("/test", handler);

      await router.handle(createReq("GET", "/test"), createRes());

      const ctx = handler.mock.calls[0][0] as Context2;
      expect(ctx).toHaveProperty("req");
      expect(ctx).toHaveProperty("res");
    });

    it("ctx.req reflects the incoming request", async () => {
      let captured: Context2 | undefined;

      const router = new Router().get("/hello", (ctx: Context2) => {
        captured = ctx;
      });

      await router.handle(createReq("GET", "/hello"), createRes());

      expect(captured!.req.method).toBe("GET");
      expect(captured!.req.url).toBe("/hello");
    });

    it("ctx.res.status().send() sets response code and body", async () => {
      const router = new Router().get("/data", (ctx: Context2) => {
        ctx.res.status(201).send({ id: 42 });
      });

      const res = createRes();
      await router.handle(createReq("GET", "/data"), res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ id: 42 });
    });

    it("handler receives next as second argument", async () => {
      const handler = vi.fn();
      const router = new Router().get("/test", handler);

      await router.handle(createReq("GET", "/test"), createRes());

      expect(typeof handler.mock.calls[0][1]).toBe("function");
    });

    it("parses query string from URL into ctx.req.query", async () => {
      let query: Record<string, string> = {};

      const router = new Router().get("/search", (ctx: Context2) => {
        query = ctx.req.query;
      });

      await router.handle(createReq("GET", "/search?q=hello&page=1"), createRes());

      expect(query).toEqual({ page: "1", q: "hello" });
    });
  });

  /* ── middleware ─────────────────────────────────────────── */

  describe("middleware", () => {
    it("fires for all routes registered after it", async () => {
      const order: string[] = [];

      const router = new Router()
        .use((_: Context2, next: Next) => {
          order.push("mw");
          next();
        })
        .get("/a", () => {
          order.push("a");
        })
        .get("/b", () => {
          order.push("b");
        });

      await router.handle(createReq("GET", "/a"), createRes());
      await router.handle(createReq("GET", "/b"), createRes());

      expect(order).toEqual(["mw", "a", "mw", "b"]);
    });

    it("preserves declaration order (top-down)", async () => {
      const order: number[] = [];

      const router = new Router()
        .use((_: Context2, next: Next) => {
          order.push(1);
          next();
        })
        .use((_: Context2, next: Next) => {
          order.push(2);
          next();
        })
        .use((_: Context2, next: Next) => {
          order.push(3);
          next();
        })
        .get("/test", () => {
          order.push(4);
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual([1, 2, 3, 4]);
    });

    it("does not apply to routes declared before it", async () => {
      const order: string[] = [];

      const router = new Router()
        .get("/first", () => {
          order.push("first");
        })
        .use((_: Context2, next: Next) => {
          order.push("mw");
          next();
        })
        .get("/second", () => {
          order.push("second");
        });

      await router.handle(createReq("GET", "/first"), createRes());
      await router.handle(createReq("GET", "/second"), createRes());

      // /first has no middleware (registered before use)
      // /second has mw in its chain
      expect(order).toEqual(["first", "mw", "second"]);
    });

    it("not calling next() stops the chain", async () => {
      const order: string[] = [];

      const router = new Router()
        .use(() => {
          order.push("blocker"); /* no next() */
        })
        .get("/test", () => {
          order.push("handler");
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual(["blocker"]);
    });

    it("can enrich the context for downstream handlers", async () => {
      let captured: unknown;

      const router = new Router()
        .use((ctx: Context2, next: Next) => {
          (ctx as { userId: string } & Context2).userId = "user-123";
          next();
        })
        .get("/me", (ctx: Context2) => {
          captured = (ctx as { userId: string } & Context2).userId;
        });

      await router.handle(createReq("GET", "/me"), createRes());

      expect(captured).toBe("user-123");
    });

    it("async middleware with await next()", async () => {
      const order: string[] = [];

      const router = new Router()
        .use(async (_: Context2, next: Next) => {
          order.push("before");
          await next();
          order.push("after");
        })
        .get("/test", () => {
          order.push("handler");
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual(["before", "handler", "after"]);
    });

    it("nested async middleware forms an onion (Koa-style)", async () => {
      const order: string[] = [];

      const router = new Router()
        .use(async (_: Context2, next: Next) => {
          order.push("mw1-in");
          await next();
          order.push("mw1-out");
        })
        .use(async (_: Context2, next: Next) => {
          order.push("mw2-in");
          await next();
          order.push("mw2-out");
        })
        .get("/test", () => {
          order.push("handler");
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual(["mw1-in", "mw2-in", "handler", "mw2-out", "mw1-out"]);
    });
  });

  /* ── nesting ───────────────────────────────────────────── */

  describe("nesting", () => {
    it("prefixes nested routes", async () => {
      const handler = vi.fn();

      const router = new Router().nest("/api", (r) => r.get("/users", handler));

      await router.handle(createReq("GET", "/api/users"), createRes());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("nested route does not match without its prefix", async () => {
      const handler = vi.fn();

      const router = new Router().nest("/api", (r) => r.get("/users", handler));

      await router.handle(createReq("GET", "/users"), createRes());

      expect(handler).not.toHaveBeenCalled();
    });

    it("parent middleware applies to nested routes", async () => {
      const order: string[] = [];

      const router = new Router()
        .use((_: Context2, next: Next) => {
          order.push("parent");
          next();
        })
        .nest("/api", (r) =>
          r.get("/data", () => {
            order.push("handler");
          }),
        );

      await router.handle(createReq("GET", "/api/data"), createRes());

      expect(order).toEqual(["parent", "handler"]);
    });

    it("nested middleware does not leak to parent routes", async () => {
      const order: string[] = [];

      const router = new Router()
        .nest("/api", (r) =>
          r
            .use((_: Context2, next: Next) => {
              order.push("nested-mw");
              next();
            })
            .get("/data", () => {
              order.push("data");
            }),
        )
        .get("/root", () => {
          order.push("root");
        });

      await router.handle(createReq("GET", "/root"), createRes());
      await router.handle(createReq("GET", "/api/data"), createRes());

      expect(order).toEqual(["root", "nested-mw", "data"]);
    });

    it("deeply nested routes work correctly", async () => {
      const handler = vi.fn();

      const router = new Router().nest("/api", (r) =>
        r.nest("/v1", (r) => r.nest("/users", (r) => r.get("/:id", handler))),
      );

      await router.handle(createReq("GET", "/api/v1/users/42"), createRes());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("middleware scope is preserved across nesting levels", async () => {
      const order: string[] = [];

      const logger = (_: Context2, next: Next) => {
        order.push("log");
        next();
      };
      const auth = (_: Context2, next: Next) => {
        order.push("auth");
        next();
      };
      const db = (_: Context2, next: Next) => {
        order.push("db");
        next();
      };

      const router = new Router()
        .use(logger)
        .nest("/api", (r) =>
          r
            .use(auth)
            .get("/public", () => {
              order.push("public");
            })
            .use(db)
            .get("/private", () => {
              order.push("private");
            }),
        )
        .get("/health", () => {
          order.push("health");
        });

      // GET /api/public  → log, auth, handler
      await router.handle(createReq("GET", "/api/public"), createRes());
      expect(order).toEqual(["log", "auth", "public"]);

      order.length = 0;

      // GET /api/private → log, auth, db, handler
      await router.handle(createReq("GET", "/api/private"), createRes());
      expect(order).toEqual(["log", "auth", "db", "private"]);

      order.length = 0;

      // GET /health      → log, handler (no auth, no db)
      await router.handle(createReq("GET", "/health"), createRes());
      expect(order).toEqual(["log", "health"]);
    });

    it("nest inside nest inherits parent middleware chain", async () => {
      const order: string[] = [];

      const router = new Router()
        .use((_: Context2, next: Next) => {
          order.push("root");
          next();
        })
        .nest("/a", (r) =>
          r
            .use((_: Context2, next: Next) => {
              order.push("a");
              next();
            })
            .nest("/b", (r) =>
              r
                .use((_: Context2, next: Next) => {
                  order.push("b");
                  next();
                })
                .get("/c", () => {
                  order.push("handler");
                }),
            ),
        );

      await router.handle(createReq("GET", "/a/b/c"), createRes());

      expect(order).toEqual(["root", "a", "b", "handler"]);
    });
  });

  /* ── radix tree routing ────────────────────────────────── */

  describe("radix tree routing", () => {
    it("extracts single route parameter", async () => {
      let params: Record<string, string> = {};

      const router = new Router().get("/users/:id", (ctx: Context2) => {
        params = ctx.req.params;
      });

      await router.handle(createReq("GET", "/users/42"), createRes());

      expect(params).toEqual({ id: "42" });
    });

    it("extracts multiple route parameters", async () => {
      let params: Record<string, string> = {};

      const router = new Router().get("/users/:userId/posts/:postId", (ctx: Context2) => {
        params = ctx.req.params;
      });

      await router.handle(createReq("GET", "/users/1/posts/99"), createRes());

      expect(params).toEqual({ postId: "99", userId: "1" });
    });

    it("static routes take priority over parametric", async () => {
      const called: string[] = [];

      const router = new Router()
        .get("/users/me", () => {
          called.push("static");
        })
        .get("/users/:id", () => {
          called.push("param");
        });

      await router.handle(createReq("GET", "/users/me"), createRes());

      expect(called).toEqual(["static"]);
    });

    it("handles routes with shared prefixes (radix compression)", async () => {
      const a = vi.fn();
      const b = vi.fn();
      const c = vi.fn();

      const router = new Router().get("/test", a).get("/testing", b).get("/testing/:param", c);

      await router.handle(createReq("GET", "/test"), createRes());
      await router.handle(createReq("GET", "/testing"), createRes());
      await router.handle(createReq("GET", "/testing/abc"), createRes());

      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
      expect(c).toHaveBeenCalledOnce();
    });

    it("does not match partial path segments", async () => {
      const handler = vi.fn();
      const router = new Router().get("/test", handler);

      await router.handle(createReq("GET", "/tes"), createRes());
      await router.handle(createReq("GET", "/testing"), createRes());

      expect(handler).not.toHaveBeenCalled();
    });

    it("parametric route in nested scope extracts params correctly", async () => {
      let params: Record<string, string> = {};

      const router = new Router().nest("/api", (r) =>
        r.get("/items/:itemId", (ctx: Context2) => {
          params = ctx.req.params;
        }),
      );

      await router.handle(createReq("GET", "/api/items/xyz"), createRes());

      expect(params).toEqual({ itemId: "xyz" });
    });

    it("matches parametric route at root of nested scope", async () => {
      let params: Record<string, string> = {};

      const router = new Router().nest("/users", (r) =>
        r.get("/:id", (ctx: Context2) => {
          params = ctx.req.params;
        }),
      );

      await router.handle(createReq("GET", "/users/7"), createRes());

      expect(params).toEqual({ id: "7" });
    });
  });

  /* ── zod schema validation ─────────────────────────────── */

  describe("schema validation", () => {
    it("allows valid request body", async () => {
      const handler = vi.fn((ctx: Context2) => {
        ctx.res.status(201).send({ ok: true });
      });

      const router = new Router().post(
        "/users",
        { schema: { body: z.object({ age: z.number(), name: z.string() }) } },
        handler,
      );

      const res = createRes();
      await router.handle(createReq("POST", "/users", { age: 30, name: "Alice" }), res);

      expect(handler).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(201);
    });

    it("rejects invalid body with 400 status", async () => {
      const handler = vi.fn();

      const router = new Router().post(
        "/users",
        { schema: { body: z.object({ name: z.string() }) } },
        handler,
      );

      const res = createRes();
      await router.handle(
        createReq("POST", "/users", { name: 123 }), // name should be string
        res,
      );

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    it("rejects request when required body fields are missing", async () => {
      const handler = vi.fn();

      const router = new Router().post(
        "/users",
        { schema: { body: z.object({ email: z.string(), name: z.string() }) } },
        handler,
      );

      const res = createRes();
      await router.handle(
        createReq("POST", "/users", { name: "Alice" }), // missing email
        res,
      );

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    it("validates route params against schema", async () => {
      const handler = vi.fn();

      const router = new Router().get(
        "/users/:id",
        { schema: { params: z.object({ id: z.string().regex(/^\d+$/) }) } },
        handler,
      );

      const res = createRes();
      await router.handle(createReq("GET", "/users/abc"), res); // non-numeric

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    it("passes when route params match schema", async () => {
      const handler = vi.fn();

      const router = new Router().get(
        "/users/:id",
        { schema: { params: z.object({ id: z.string().regex(/^\d+$/) }) } },
        handler,
      );

      await router.handle(createReq("GET", "/users/42"), createRes());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("validates query parameters against schema", async () => {
      const handler = vi.fn();

      const router = new Router().get(
        "/items",
        { schema: { query: z.object({ page: z.string() }) } },
        handler,
      );

      const res = createRes();
      await router.handle(createReq("GET", "/items"), res); // no query params

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
    });

    it("passes when query matches schema", async () => {
      const handler = vi.fn();

      const router = new Router().get(
        "/items",
        { schema: { query: z.object({ page: z.string() }) } },
        handler,
      );

      await router.handle(createReq("GET", "/items?page=1"), createRes());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("validates response body per status code", async () => {
      const router = new Router().get(
        "/user",
        {
          schema: {
            response: { 200: z.object({ id: z.number(), name: z.string() }) },
          },
        },
        (ctx: Context2) => {
          ctx.res.status(200).send({ id: "bad" }); // id should be number
        },
      );

      const res = createRes();
      await expect(router.handle(createReq("GET", "/user"), res)).rejects.toThrow();
    });

    it("allows valid response body", async () => {
      const router = new Router().get(
        "/user",
        {
          schema: {
            response: { 200: z.object({ id: z.number(), name: z.string() }) },
          },
        },
        (ctx: Context2) => {
          ctx.res.status(200).send({ id: 1, name: "Alice" });
        },
      );

      const res = createRes();
      await router.handle(createReq("GET", "/user"), res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ id: 1, name: "Alice" });
    });
  });

  /* ── routes as middleware ───────────────────────────────── */

  describe("routes as middleware", () => {
    it("handler is the final middleware in its chain", async () => {
      const order: string[] = [];

      const router = new Router()
        .use((_: Context2, next: Next) => {
          order.push("mw");
          next();
        })
        .get("/test", () => {
          order.push("handler");
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual(["mw", "handler"]);
    });

    it("middleware + handler form a Koa-style onion", async () => {
      const order: string[] = [];

      const router = new Router()
        .use(async (_: Context2, next: Next) => {
          order.push("mw-in");
          await next();
          order.push("mw-out");
        })
        .get("/test", () => {
          order.push("handler");
        });

      await router.handle(createReq("GET", "/test"), createRes());

      expect(order).toEqual(["mw-in", "handler", "mw-out"]);
    });

    it("middleware can short-circuit the response", async () => {
      const handler = vi.fn();

      const router = new Router()
        .use((ctx: Context2) => {
          ctx.res.status(401).send({ error: "unauthorized" });
          // no next() — handler never runs
        })
        .get("/secret", handler);

      const res = createRes();
      await router.handle(createReq("GET", "/secret"), createRes());

      expect(handler).not.toHaveBeenCalled();
    });

    it("error in middleware does not silently swallow", async () => {
      const router = new Router()
        .use(() => {
          throw new Error("boom");
        })
        .get("/test", () => {});

      await expect(router.handle(createReq("GET", "/test"), createRes())).rejects.toThrow("boom");
    });
  });

  /* ── edge cases ────────────────────────────────────────── */

  describe("edge cases", () => {
    it("no registered routes — handler is never called", async () => {
      const router = new Router();
      const res = createRes();

      // should not throw
      await router.handle(createReq("GET", "/anything"), res);

      expect(res.statusCode).toBe(0); // untouched
    });

    it("middleware without any routes does not throw", async () => {
      const mw = vi.fn((_: Context2, next: Next) => next());
      const router = new Router().use(mw);

      await router.handle(createReq("GET", "/"), createRes());

      // middleware fires even if no route matches (it's in the chain)
      // but since there's no matching route, it just passes through
    });

    it("handles URL with trailing slash separately", async () => {
      const withSlash = vi.fn();
      const withoutSlash = vi.fn();

      const router = new Router().get("/items", withoutSlash).get("/items/", withSlash);

      await router.handle(createReq("GET", "/items"), createRes());
      await router.handle(createReq("GET", "/items/"), createRes());

      expect(withoutSlash).toHaveBeenCalledOnce();
      expect(withSlash).toHaveBeenCalledOnce();
    });

    it("concurrent requests do not share context", async () => {
      let ctx1: Context2 | undefined;
      let ctx2: Context2 | undefined;

      const router = new Router()
        .use(async (ctx: Context2, next: Next) => {
          (ctx as { rid: string } & Context2).rid = ctx.req.url;
          await next();
        })
        .get("/a", (ctx: Context2) => {
          ctx1 = ctx;
        })
        .get("/b", (ctx: Context2) => {
          ctx2 = ctx;
        });

      await Promise.all([
        router.handle(createReq("GET", "/a"), createRes()),
        router.handle(createReq("GET", "/b"), createRes()),
      ]);

      expect((ctx1 as { rid: string } & Context2).rid).toBe("/a");
      expect((ctx2 as { rid: string } & Context2).rid).toBe("/b");
    });
  });
});
