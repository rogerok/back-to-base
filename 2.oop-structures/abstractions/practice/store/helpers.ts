import { Cart, Order, OrdersKey } from "./index.ts";

export const makeOrder = (cart: Cart, id: string, totalAmount: number): Order => {
  return {
    id: id,
    items: cart,
    totalAmount: totalAmount,
  };
};

export const makeOrderId = (id: string): OrdersKey => `order_${id}`;

export const countTotalAmount = (cart: Cart): number =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
