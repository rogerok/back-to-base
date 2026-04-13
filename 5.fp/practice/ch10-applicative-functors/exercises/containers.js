/**
 * containers.js — готовые реализации контейнеров для упражнений по аппликативным функторам.
 *
 * Этот файл НЕ является упражнением.
 * Все контейнеры уже дополнены методами ap (из этой главы), а также
 * map, join, chain (из предыдущих глав).
 *
 * Импортируй нужные классы в своих решениях:
 *   import { Container, Maybe, Right, Left, IO, curry, liftA2, liftA3 } from './containers.js';
 */

// ---------------------------------------------------------------------------
// Вспомогательная функция curry
//
// Превращает обычную функцию с несколькими аргументами в каррированную:
//   curry((a, b) => a + b)(2)(3) === 5
//   curry((a, b) => a + b)(2, 3) === 5  ← частичное применение тоже работает
// ---------------------------------------------------------------------------

export const curry = (fn) => {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) return fn(...args);
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
};

// ---------------------------------------------------------------------------
// Container — базовая обёртка (функтор + аппликатив)
// ---------------------------------------------------------------------------

export class Container {
  constructor(value) {
    this._value = value;
  }

  static of(value) {
    return new Container(value);
  }

  map(fn) {
    return Container.of(fn(this._value));
  }

  join() {
    return this._value;
  }

  chain(fn) {
    return this.map(fn).join();
  }

  // ap: this содержит функцию, otherContainer содержит значение.
  // Применяем функцию из this к значению внутри otherContainer через map.
  ap(otherContainer) {
    return otherContainer.map(this._value);
  }

  inspect() {
    return `Container(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Maybe — безопасная работа с null / undefined
//
// ap: если this — Nothing, возвращаем Nothing (короткое замыкание).
// Иначе применяем функцию внутри this к значению внутри otherMaybe.
// ---------------------------------------------------------------------------

export class Maybe {
  constructor(value) {
    this._value = value;
  }

  static of(value) {
    return new Maybe(value);
  }

  get isNothing() {
    return this._value === null || this._value === undefined;
  }

  map(fn) {
    return this.isNothing ? this : Maybe.of(fn(this._value));
  }

  join() {
    return this.isNothing ? this : this._value;
  }

  chain(fn) {
    return this.map(fn).join();
  }

  // ap: если функция — Nothing, весь результат Nothing.
  // Если otherMaybe — Nothing, map вернёт Nothing сам по себе.
  ap(otherMaybe) {
    return this.isNothing ? this : otherMaybe.map(this._value);
  }

  getOrElse(defaultValue) {
    return this.isNothing ? defaultValue : this._value;
  }

  filter(pred) {
    return this.isNothing ? this : pred(this._value) ? this : Maybe.of(null);
  }

  inspect() {
    return this.isNothing ? 'Maybe(null)' : `Maybe(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Either — обработка ошибок с сохранением контекста
//
// Right.ap: применяем функцию к otherEither через map.
// Left.ap:  ошибка уже произошла — возвращаем Left как есть.
// ---------------------------------------------------------------------------

export class Right {
  constructor(value) {
    this._value = value;
  }

  static of(value) {
    return new Right(value);
  }

  map(fn) {
    return Right.of(fn(this._value));
  }

  join() {
    return this._value;
  }

  chain(fn) {
    return this.map(fn).join();
  }

  // ap: this содержит функцию (Right(fn)), применяем к otherEither
  ap(otherEither) {
    return otherEither.map(this._value);
  }

  getOrElse(_defaultValue) {
    return this._value;
  }

  fold(_fnLeft, fnRight) {
    return fnRight(this._value);
  }

  inspect() {
    return `Right(${this._value})`;
  }
}

export class Left {
  constructor(value) {
    this._value = value;
  }

  static of(value) {
    return new Left(value);
  }

  map(_fn) {
    return this;
  }

  join() {
    return this;
  }

  chain(_fn) {
    return this;
  }

  // ap: Left содержит ошибку, а не функцию. Пропускаем насквозь.
  ap(_otherEither) {
    return this;
  }

  getOrElse(defaultValue) {
    return defaultValue;
  }

  fold(fnLeft, _fnRight) {
    return fnLeft(this._value);
  }

  inspect() {
    return `Left(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// IO — откладывание побочных эффектов
//
// ap: this._value() возвращает функцию, otherIO._value() возвращает значение.
// Создаём новый IO, который при запуске применит функцию к значению.
// ---------------------------------------------------------------------------

export class IO {
  constructor(fn) {
    this._value = fn;
  }

  static of(value) {
    return new IO(() => value);
  }

  map(fn) {
    return new IO(() => fn(this._value()));
  }

  join() {
    return new IO(() => this._value().unsafePerformIO());
  }

  chain(fn) {
    return this.map(fn).join();
  }

  // ap: запускаем оба IO и применяем функцию к значению
  ap(otherIO) {
    return new IO(() => {
      const fn = this._value();
      const val = otherIO._value();
      return fn(val);
    });
  }

  unsafePerformIO() {
    return this._value();
  }

  inspect() {
    return 'IO(?)';
  }
}

// ---------------------------------------------------------------------------
// liftA2 / liftA3 — поднимаем обычные функции в мир контейнеров
//
// liftA2(fn, fa, fb) === fa.map(fn).ap(fb)
// liftA3(fn, fa, fb, fc) === fa.map(fn).ap(fb).ap(fc)
//
// Эквивалент: вместо fn(a, b) пишем liftA2(fn, F(a), F(b))
// ---------------------------------------------------------------------------

export const liftA2 = curry((fn, f1, f2) => f1.map(fn).ap(f2));

export const liftA3 = curry((fn, f1, f2, f3) => f1.map(fn).ap(f2).ap(f3));
