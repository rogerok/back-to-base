import { Next, Request, Response, Router } from "./index.ts";

describe("Router middleware test", () => {
  it("With global middleware", () => {
    const router = new Router();
    const mockResponse: Response = {};
    const mockRequest: Request = {};
    const callOrder: number[] = [];

    const globalMiddleware = (_: Request, __: Response, next: Next): void => {
      callOrder.push(0);
      next();
    };

    const firstMiddleware = (_: Request, __: Response, next: Next): void => {
      callOrder.push(1);
      next();
    };

    router.use("*", globalMiddleware);
    router.use("/", firstMiddleware);

    router.get("/", mockRequest, mockResponse);
    router.get("/first", mockRequest, mockResponse);

    expect(callOrder).toEqual([0, 1, 0]);
  });

  it("Without calling next", () => {
    const router = new Router();
    const mockResponse: Response = {};
    const mockRequest: Request = {};
    const callOrder: number[] = [];

    const globalMiddleware = (_: Request, __: Response, next: Next): void => {
      callOrder.push(0);
      next();
    };

    const firstMiddleware = (): void => {
      callOrder.push(1);
    };
    const secondMiddleware = (): void => {
      callOrder.push(2);
    };

    router.use("*", globalMiddleware);
    router.use("/first", firstMiddleware);
    router.use("/second", secondMiddleware);

    router.get("/", mockRequest, mockResponse);
    router.get("/first", mockRequest, mockResponse);

    expect(callOrder).toEqual([0, 0, 1]);
  });
});
