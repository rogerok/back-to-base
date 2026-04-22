// Task 7: ReaderTaskEither — полный пайплайн
//
// Финальное задание. Объединяет все концепции из предыдущих задач.
// В задании от ментора program был RTE-пайплайном:
//   loadSettings → generateRounds → runGame → calculateScore → finishGame
// Здесь — аналогичный пайплайн: система онлайн-заказов.
//
// Перепиши используя:
// - RTE.ask / RTE.asks для получения зависимостей (Reader)
// - RTE.fromIOEither для подъёма IOEither
// - RTE.fromTaskEither для подъёма TaskEither
// - RTE.flatMap, RTE.map для цепочки
// - pipe для пайплайна

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

async function placeOrder(
  env: AppEnv,
  userId: number,
  productIds: number[],
): Promise<Order | OrderError> {
  // 1. Validate item count
  if (productIds.length > env.config.maxOrderItems) {
    return {
      type: "TooManyItems",
      max: env.config.maxOrderItems,
      got: productIds.length,
    };
  }

  // 2. Get user
  let user: User | null;
  try {
    user = await env.db.getUser(userId);
  } catch (e) {
    return { type: "DbError", message: (e as Error).message };
  }

  if (!user) {
    return { type: "UserNotFound", userId };
  }

  // 3. Get products
  let products: Product[];
  try {
    products = await env.db.getProducts(productIds);
  } catch (e) {
    return { type: "DbError", message: (e as Error).message };
  }

  // 4. Check stock
  const outOfStock = products.filter((p) => !p.inStock);
  if (outOfStock.length > 0) {
    return { type: "OutOfStock", products: outOfStock.map((p) => p.name) };
  }

  // 5. Calculate total
  const subtotal = products.reduce((sum, p) => sum + p.price, 0);
  const tax = subtotal * env.config.taxRate;
  const total = subtotal + tax;

  // 6. Save order
  let order: Order;
  try {
    order = await env.db.saveOrder({
      userId,
      items: products,
      total,
      tax,
    });
  } catch (e) {
    return { type: "DbError", message: (e as Error).message };
  }

  // 7. Log
  env.logger.info(`Order placed for ${user.name}: $${total.toFixed(2)}`);

  return order;
}

export { placeOrder };
export type { AppEnv, User, Product, Order, OrderError };
