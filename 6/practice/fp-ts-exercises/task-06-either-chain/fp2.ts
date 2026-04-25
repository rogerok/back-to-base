import * as A from "fp-ts/lib/Array.js";
import * as E from "fp-ts/lib/Either.js";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option.js";

// Your solution here

type AppError =
  | { message: string; type: "NotFoundError" }
  | { message: string; type: "ParseError" }
  | { message: string; type: "ValidationError" };

interface Order {
  amount: number;
  id: number;
  status: "cancelled" | "paid" | "pending";
  userId: number;
}

const orders: Order[] = [
  { amount: 250, id: 1, status: "paid", userId: 10 },
  { amount: 80, id: 2, status: "pending", userId: 10 },
  { amount: 410, id: 3, status: "cancelled", userId: 11 },
];

const parseOrderId = (raw: string): E.Either<AppError, number> =>
  pipe(
    parseInt(raw, 10),
    E.fromPredicate(
      (n) => !isNaN(n),
      () => ({ message: `"${raw}" is not a valid ID`, type: "ParseError" }),
    ),
  );

export const findOrder = (id: number) =>
  pipe(
    orders,
    A.findFirst((p) => p.id === id),
    O.foldW(
      () => E.left({ message: `Order ${id} not found`, type: "NotFoundError" }),
      (p) => E.right(p),
    ),
  );

export const validateOrderStatus = (order: Order): E.Either<AppError, Order> =>
  pipe(
    order,
    E.fromPredicate(
      (o) => o.status !== "cancelled",
      (): AppError => ({ message: "Cannot process a cancelled order", type: "ValidationError" }),
    ),
  );

type R = E.Either<AppError, { discount: number; order: Order }>;

const processOrder = (rawId: string) =>
  pipe(
    rawId,
    parseOrderId,
    E.chain(findOrder),
    E.chainW(validateOrderStatus),
    E.chainW(applyDiscount),
    E.foldW(
      (e) => `Error [${e.type}]: ${e.message}`,
      (o) => `Order #${o.order.id} processed. Discount: $${o.discount}`,
    ),
  );

export const applyDiscount = (order: Order): R =>
  pipe(
    order,
    E.fromPredicate(
      (o) => o.amount >= 100,
      (): AppError => ({
        message: "Order amount too low for discount",
        type: "ValidationError",
      }),
    ),
    E.map((o) => ({
      discount: o.amount * 0.1,
      order: o,
    })),
  );

console.log(processOrder("1")); // "Order #1 processed. Discount: $25"
console.log(processOrder("2")); // Error [ValidationError]: Order amount too low for discount
console.log(processOrder("3")); // Error [ValidationError]: Cannot process a cancelled order
console.log(processOrder("99")); // Error [NotFoundError]: Order 99 not found
console.log(processOrder("abc")); // Error [ParseError]: "abc" is not a valid ID