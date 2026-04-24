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

const parse = (raw: string): E.Either<AppError, number> => {
  const id = parseInt(raw, 10);
  if (isNaN(id)) return E.left({ message: `"${raw}" is not a valid ID`, type: "ParseError" });

  return E.right(id);
};

const parseOrderId = flow(
  parse,
  E.foldW(
    (e) => e,
    (n) => n,
  ),
);

export const findOrder = (id: number) =>
  pipe(
    products,
    A.findFirst((p) => p.id === id),
    O.foldW(
      () => ({ message: `Order ${id} not found`, type: "NotFoundError" }),
      (p) => p,
    ),
  );
