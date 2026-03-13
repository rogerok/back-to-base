// Можно в том же файле или в отдельном compose.test.ts
import { compose } from "./compose.ts";

describe("Iter 4: compose", () => {
  it("вызывает одну функцию", async () => {
    const fn = vi.fn((_ctx: any, next: any) => next());
    const composed = compose([fn]);

    console.log(composed);

    await composed({});

    expect(fn).toHaveBeenCalledOnce();
  });

  it("вызывает функции по порядку", async () => {
    const order: number[] = [];

    const composed = compose([
      (_ctx: any, next: any) => {
        order.push(1);
        return next();
      },
      (_ctx: any, next: any) => {
        order.push(2);
        return next();
      },
      (_ctx: any, next: any) => {
        order.push(3);
      },
    ]);

    await composed({});

    expect(order).toEqual([1, 2, 3]);
  });

  it("без next() цепочка останавливается", async () => {
    const order: string[] = [];

    const composed = compose([
      (_ctx: any) => {
        order.push("blocker"); /* нет next! */
      },
      (_ctx: any) => {
        order.push("never");
      },
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
      (ctx: any, next: any) => {
        ctxs.push(ctx);
        return next();
      },
      (ctx: any, next: any) => {
        ctxs.push(ctx);
        return next();
      },
    ]);

    const ctx = { id: 1 };
    await composed(ctx);

    expect(ctxs[0]).toBe(ctx);
    expect(ctxs[1]).toBe(ctx);
  });

  it("ошибка в middleware пробрасывается наверх", async () => {
    const composed = compose([
      () => {
        throw new Error("boom");
      },
    ]);

    await expect(composed({})).rejects.toThrow("boom");
  });

  it("пустой массив — ничего не падает", async () => {
    const composed = compose([]);
    await composed({});
  });
});
