// Task 7: ReaderTaskEither — полный пайплайн
//
// Перепиши placeOrder используя RTE:
// - RTE.asks для доступа к env.config, env.db, env.logger
// - RTE.fromEither для синхронной валидации
// - RTE.fromTaskEither / TE.tryCatch для async операций с БД
// - RTE.flatMap для цепочки шагов
// - RTE.fromIO для логирования
// - pipe для всего пайплайна
//
// Результат: (userId, productIds) => RTE.ReaderTaskEither<AppEnv, OrderError, Order>

import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";

interface AppEnv {
  db: {
    getUser: (id: number) => Promise<User | null>;
    getProducts: (ids: number[]) => Promise<Product[]>;
    saveOrder: (order: Order) => Promise<Order>;
  };
  logger: {
    info: (msg: string) => void;
  };
  config: {
    maxOrderItems: number;
    taxRate: number;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

interface Order {
  userId: number;
  items: Product[];
  total: number;
  tax: number;
}

type OrderError =
  | { type: "UserNotFound"; userId: number }
  | { type: "TooManyItems"; max: number; got: number }
  | { type: "OutOfStock"; products: string[] }
  | { type: "DbError"; message: string };

// TODO: Разбей на маленькие функции и собери в pipe
//
// Подсказка по структуре:
//
// const validateItemCount = (productIds: number[]) =>
//   pipe(
//     RTE.asks((env: AppEnv) => env.config.maxOrderItems),
//     RTE.flatMap((max) =>
//       productIds.length > max
//         ? RTE.left({ type: "TooManyItems", max, got: productIds.length } as OrderError)
//         : RTE.right(undefined)
//     ),
//   )
//
// const getUser = (userId: number) =>
//   pipe(
//     RTE.asks((env: AppEnv) => env.db.getUser),
//     RTE.flatMap((fn) =>
//       RTE.fromTaskEither(TE.tryCatch(() => fn(userId), (e) => ({ type: "DbError", ... })))
//     ),
//     RTE.flatMap((user) => user ? RTE.right(user) : RTE.left({ type: "UserNotFound", ... }))
//   )
//
// const placeOrder = (userId: number, productIds: number[]) =>
//   pipe(
//     validateItemCount(productIds),
//     RTE.flatMap(() => getUser(userId)),
//     RTE.flatMap((user) => ...getProducts...),
//     RTE.flatMap((products) => ...checkStock...),
//     RTE.flatMap((products) => ...calculateAndSave...),
//   )

const placeOrder = (
  userId: number,
  productIds: number[],
): RTE.ReaderTaskEither<AppEnv, OrderError, Order> => {
  throw new Error("TODO");
};

export { placeOrder };
export type { AppEnv, User, Product, Order, OrderError };
