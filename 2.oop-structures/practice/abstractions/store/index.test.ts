import { describe, expect, it } from "vitest";

import type { Cart, Catalog, Order, Orders, OrdersKey } from "./index.ts";

import { countTotalAmount, makeOrderId } from "./helpers.ts";
import { addProduct, addToCart, getProductById, placeOrder, removeProduct } from "./index.ts";

describe("store (mutable, updated typing)", () => {
  describe("catalog", () => {
    it("adds product to catalog (mutates catalog)", () => {
      const catalog: Catalog = {
        "1": { id: 1, name: "молоко", price: 100 },
      };

      const product = { id: 2, name: "сыр", price: 200 };

      const result = addProduct(catalog, product);

      expect(result).toBe(catalog);
      expect(catalog["2"]).toEqual(product);
    });

    it("removes product from catalog (mutates catalog)", () => {
      const catalog: Catalog = {
        "1": { id: 1, name: "молоко", price: 100 },
        "2": { id: 2, name: "сыр", price: 200 },
      };

      removeProduct(catalog, { id: 2, name: "сыр", price: 200 });

      expect(catalog["2"]).toBeUndefined();
      expect(catalog["1"]).toBeDefined();
    });

    it("returns product by id", () => {
      const catalog: Catalog = {
        "1": { id: 1, name: "молоко", price: 100 },
      };

      const product = getProductById(catalog, "1");

      expect(product).toEqual({
        id: 1,
        name: "молоко",
        price: 100,
      });
    });
  });

  describe("cart", () => {
    it("adds product to cart (mutates cart)", () => {
      const catalog: Catalog = {
        "1": { id: 1, name: "молоко", price: 100 },
        "2": { id: 2, name: "сыр", price: 200 },
      };

      const cart: Cart = [];

      addToCart(catalog, cart, "2", 2);

      expect(cart).toHaveLength(1);
      expect(cart[0]).toEqual({
        id: 2,
        name: "сыр",
        price: 200,
        quantity: 2,
      });
    });

    it("allows adding multiple products sequentially", () => {
      const catalog: Catalog = {
        "1": { id: 1, name: "молоко", price: 100 },
        "2": { id: 2, name: "сыр", price: 200 },
      };

      const cart: Cart = [];

      addToCart(catalog, cart, "2", 2);
      addToCart(catalog, cart, "1", 1);

      expect(cart).toEqual([
        { id: 2, name: "сыр", price: 200, quantity: 2 },
        { id: 1, name: "молоко", price: 100, quantity: 1 },
      ]);
    });
  });

  describe("helpers", () => {
    it("counts total amount correctly", () => {
      const cart: Cart = [
        { id: 1, name: "молоко", price: 100, quantity: 2 },
        { id: 2, name: "сыр", price: 200, quantity: 1 },
      ];

      expect(countTotalAmount(cart)).toBe(400);
    });

    it("generates valid order id", () => {
      const id: OrdersKey = makeOrderId("123");

      expect(id).toBe("order_123");
    });
  });

  describe("orders", () => {
    it("places order and clears cart", () => {
      const cart: Cart = [
        { id: 2, name: "сыр", price: 200, quantity: 2 },
        { id: 1, name: "молоко", price: 100, quantity: 1 },
      ];

      const orders: Orders = {};

      const { newCart, newOrders } = placeOrder(cart, orders as unknown as Order);

      expect(newCart).toEqual([]);

      const orderKeys = Object.keys(newOrders) as OrdersKey[];
      expect(orderKeys).toHaveLength(1);

      const order = newOrders[orderKeys[0]];

      expect(order.items).toBe(cart);
      expect(order.totalAmount).toBe(500);
    });

    it("adds order to existing orders", () => {
      const cart: Cart = [{ id: 1, name: "молоко", price: 100, quantity: 1 }];

      const orders: Orders = {
        order_1: {
          id: "order_1",
          items: [],
          totalAmount: 0,
        },
      };

      const { newOrders } = placeOrder(cart, orders as unknown as Order);

      expect(Object.keys(newOrders)).toHaveLength(2);
      expect(newOrders["order_2"]).toBeDefined();
    });
  });
});
