// Mutable
import { countTotalAmount, makeOrder, makeOrderId } from "./helpers.ts";

export type CatalogProduct = {
  id: number;
  name: string;
  price: number;
};

export type Catalog = Record<string, CatalogProduct>;
export type CatalogKeys = keyof Catalog;

export type CartProduct = {
  quantity: number;
} & CatalogProduct;

export type Cart = CartProduct[];

export type Order = {
  id: string;
  items: Cart;
  totalAmount: number;
};

export type OrdersKey = `order_${string}`;

export type Orders = {
  [key: OrdersKey]: Order;
};

export const addProduct = (catalog: Catalog, product: CatalogProduct): Catalog => {
  catalog[product.id] = product;

  return catalog;
};

export const removeProduct = (catalog: Catalog, product: CatalogProduct): Catalog => {
  if (product.id in catalog) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete catalog[product.id];
  }

  return catalog;
};

export const getProductById = (catalog: Catalog, id: CatalogKeys): CatalogProduct => catalog[id];

export const addToCart = (
  catalog: Catalog,
  cart: Cart,
  id: CatalogKeys,
  quantity: number,
): void => {
  cart.push({
    ...catalog[id],
    quantity,
  });
};

export const orders = {};

export const placeOrder = (cart: Cart, orders: Order): { newCart: Cart; newOrders: Orders } => {
  const totalAmount = countTotalAmount(cart);

  const orderId = makeOrderId(String(Object.keys(orders).length + 1));

  const newOrders: Orders = {
    ...orders,
    [orderId]: makeOrder(cart, orderId, totalAmount),
  };

  return {
    newCart: [],
    newOrders: newOrders,
  };
};
