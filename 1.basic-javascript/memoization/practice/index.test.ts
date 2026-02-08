// import { expect, test, vi } from "vitest";
//
// import { memoize } from "./index.ts";
//
// test("memoization should call callback only once", () => {
//   // Создаем функцию-шпион. Vitest будет считать, сколько раз её вызвали.
//   const expensiveFunc = vi.fn((n: number) => n * 2);
//
//   const memoizedFunc = memoize(expensiveFunc);
//
//   // Вызываем первый раз
//   const res1 = memoizedFunc(10);
//
//   // Вызываем второй раз
//   const res2 = memoizedFunc(10);
//
//   // Проверяем результаты
//   expect(res1).toBe(20);
//   expect(res2).toBe(20);
//
//   // САМАЯ ВАЖНАЯ ПРОВЕРКА:
//   // Мы вызвали мемоизированную функцию 2 раза, но исходная (expensiveFunc)
//   // должна была сработать только 1 раз.
//   expect(expensiveFunc).toHaveBeenCalledTimes(1);
// });
