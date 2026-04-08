/**
 * Упражнение 1: Разминка — join и снятие вложенности
 * Сложность: начинающий
 *
 * Задача:
 *   Понять, что делает join на конкретных примерах. Сначала напишешь
 *   собственный класс Box с join, потом проверишь, что join работает
 *   и на готовом Maybe из containers.ts.
 *
 * Запуск:
 *   npx tsx exercise-1.ts
 */

import { Maybe } from "./containers.ts";

// ---------------------------------------------------------------------------
// Задание 1.1 — собственный класс Box
//
// Напиши класс Box с методами:
//   static of(value)  — оборачивает значение
//   map(fn)           — трансформирует значение внутри, возвращает новый Box
//   join()            — снимает один слой: Box(Box(x)).join() → Box(x)
//
// Запомни ключевое правило: join НЕ знает, что внутри.
// Он просто возвращает то, что лежит внутри _value.
// Если внутри Box — отдаёт этот Box. Если число — отдаёт число.
//
// Пример:
//   Box.of(42).join()              → 42
//   Box.of(Box.of(42)).join()      → Box(42)
//   Box.of(Box.of(Box.of(7)))
//     .join()                      → Box(Box(7))
//     .join()                      → Box(7)
//     .join()                      → 7
// ---------------------------------------------------------------------------

export class Box<A> {
  readonly _value: A;

  constructor(value: A) {
    this._value = value;
  }

  static of<A>(value: A): Box<A> {
    return new Box(value);
  }

  map<B>(fn: (a: A) => B): Box<B> {
    return new Box(fn(this._value));
  }

  join(): A {
    // TODO: верни this._value (просто снять обёртку)
    return this._value;
  }

  inspect(): string {
    const inner = (this._value as unknown as { inspect?: () => string }).inspect?.() ?? this._value;
    return `Box(${String(inner)})`;
  }
}

// ---------------------------------------------------------------------------
// Задание 1.2 — тройное вложение Box
//
// Напиши функцию flattenBox(tripleNested), которая принимает
// Box(Box(Box(value))) и возвращает Box(value).
//
// Используй два вызова join() подряд.
//
// Пример:
//   flattenBox(Box.of(Box.of(Box.of('привет')))) → Box('привет')
// ---------------------------------------------------------------------------

export const flattenBox = <A>(tripleNested: Box<Box<Box<A>>>): Box<A> => {
  return tripleNested.join().join();
};

// ---------------------------------------------------------------------------
// Задание 1.3 — map + join вместо chain
//
// Есть функция safeDivide: если делитель равен 0 — возвращает Box(null),
// иначе — Box(результат).
//
// Напиши функцию divideAndDouble(a, b), которая:
//   1. Делит a на b через safeDivide (получаем Box(Maybe или число))
//   2. Применяет удвоение через map
//   3. Убирает лишний слой через join
//
// Другими словами: map(fn) + join() = то, что в следующем упражнении
// будет называться chain.
//
// Пример:
//   divideAndDouble(10, 2)  → Box(10)   // (10/2) * 2 = 10
//   divideAndDouble(9, 3)   → Box(6)    // (9/3)  * 2 = 6
//   divideAndDouble(5, 0)   → Box(null) // деление на 0 → Box(null)
// ---------------------------------------------------------------------------

export const safeDivide = (a: number, b: number): Box<number | null> =>
  b === 0 ? Box.of(null) : Box.of(a / b);

export const divideAndDouble = (a: number, b: number): Box<number | null> => {
  return safeDivide(a, b)
    .map((a) => (a === null ? Box.of(null) : Box.of(a * 2)))
    .join();
};

// ---------------------------------------------------------------------------
// Задание 1.4 — проверка Maybe.join из containers.ts
//
// Используй уже готовый Maybe из containers.ts.
// Напиши функцию unwrapNested(value), которая:
//   — принимает любое значение
//   — оборачивает его в Maybe дважды: Maybe.of(Maybe.of(value))
//   — применяет join
//   — возвращает результат
//
// Это демонстрирует: join работает так же на Maybe, как на Box.
//
// Пример:
//   unwrapNested(99)   → Maybe(99)      // Maybe(Maybe(99)).join() = Maybe(99)
//   unwrapNested(null) → Maybe(null)    // Maybe(Maybe(null)).join() = Maybe(null)
// ---------------------------------------------------------------------------

export const unwrapNested = <A>(value: A | null): Maybe<A> => {
  return Maybe.of(Maybe.of(value)).join();
};
