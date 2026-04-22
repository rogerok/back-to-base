import { describe, it, expect } from "vitest";
import * as E from "fp-ts/Either";
import { placeOrder, type AppEnv, type Order, type OrderError, type User, type Product } from "./imperative";

const products: Product[] = [
  { id: 1, name: "Laptop", price: 1000, inStock: true },
  { id: 2, name: "Mouse", price: 25, inStock: true },
  { id: 3, name: "Keyboard", price: 75, inStock: false },
];

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@test.com" },
];

function makeEnv(overrides?: Partial<AppEnv>): AppEnv {
  return {
    db: {
      getUser: async (id) => users.find((u) => u.id === id) ?? null,
      getProducts: async (ids) => products.filter((p) => ids.includes(p.id)),
      saveOrder: async (order) => order,
    },
    logger: { info: () => {} },
    config: { maxOrderItems: 5, taxRate: 0.1 },
    ...overrides,
  };
}

describe("Task 7: RTE pipeline", () => {
  it("places a valid order", async () => {
    const env = makeEnv();
    const result = await runPlaceOrder(env, 1, [1, 2]);
    const order = unwrap(result);

    expect(order.userId).toBe(1);
    expect(order.items).toHaveLength(2);
    expect(order.total).toBeCloseTo(1127.5); // (1000+25) * 1.1
    expect(order.tax).toBeCloseTo(102.5);
  });

  it("returns TooManyItems error", async () => {
    const env = makeEnv({ config: { maxOrderItems: 1, taxRate: 0.1 } });
    const result = await runPlaceOrder(env, 1, [1, 2]);
    const error = unwrapError(result);

    expect(error.type).toBe("TooManyItems");
  });

  it("returns UserNotFound error", async () => {
    const env = makeEnv();
    const result = await runPlaceOrder(env, 999, [1]);
    const error = unwrapError(result);

    expect(error.type).toBe("UserNotFound");
  });

  it("returns OutOfStock error", async () => {
    const env = makeEnv();
    const result = await runPlaceOrder(env, 1, [3]); // keyboard out of stock
    const error = unwrapError(result);

    expect(error.type).toBe("OutOfStock");
  });

  it("returns DbError on db failure", async () => {
    const env = makeEnv({
      db: {
        getUser: async () => { throw new Error("connection lost"); },
        getProducts: async () => [],
        saveOrder: async (o) => o,
      },
    });
    const result = await runPlaceOrder(env, 1, [1]);
    const error = unwrapError(result);

    expect(error.type).toBe("DbError");
  });
});

// Хелперы для совместимости imperative/fp
async function runPlaceOrder(env: AppEnv, userId: number, productIds: number[]) {
  const result = placeOrder(env as any, userId, productIds);

  // FP: RTE — (env) => () => Promise<Either>
  if (typeof result === "function") {
    const te = (result as any)(env);
    if (typeof te === "function") {
      return te();
    }
    return te;
  }
  // Imperative: Promise
  return result;
}

function isEither(x: unknown): x is E.Either<unknown, unknown> {
  return typeof x === "object" && x !== null && "_tag" in x && (x._tag === "Left" || x._tag === "Right");
}

function unwrap(result: unknown): Order {
  if (isEither(result)) {
    if (E.isRight(result)) return result.right as Order;
    throw new Error(`Expected Right, got Left: ${JSON.stringify(result.left)}`);
  }
  // Imperative: Order | OrderError
  if (typeof result === "object" && result !== null && "type" in result) {
    throw new Error(`Expected Order, got error: ${JSON.stringify(result)}`);
  }
  return result as Order;
}

function unwrapError(result: unknown): OrderError {
  if (isEither(result)) {
    if (E.isLeft(result)) return result.left as OrderError;
    throw new Error("Expected Left, got Right");
  }
  // Imperative: Order | OrderError
  if (typeof result === "object" && result !== null && "type" in result) {
    return result as OrderError;
  }
  throw new Error("Expected error");
}
