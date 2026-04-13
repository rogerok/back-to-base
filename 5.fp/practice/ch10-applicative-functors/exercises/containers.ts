/**
 * containers.ts — готовые реализации контейнеров для упражнений по аппликативным функторам.
 *
 * Этот файл НЕ является упражнением.
 * Все контейнеры уже дополнены методами ap (из этой главы), а также
 * map, join, chain (из предыдущих глав).
 *
 * Импортируй нужные классы в своих решениях:
 *   import { Container, Maybe, Right, Left, IO, curry, liftA2, liftA3 } from './containers.ts';
 */

// ---------------------------------------------------------------------------
// Вспомогательная функция curry
//
// Превращает обычную функцию с несколькими аргументами в каррированную:
//   curry((a, b) => a + b)(2)(3) === 5
//   curry((a, b) => a + b)(2, 3) === 5  ← частичное применение тоже работает
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const curry = <T extends (...args: any[]) => any>(fn: T) => {
  const arity = fn.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function curried(...args: any[]): any {
    if (args.length >= arity) return fn(...args);
    return (...moreArgs: any[]) => curried(...args, ...moreArgs);
  };
};

// ---------------------------------------------------------------------------
// Container — базовая обёртка (функтор + аппликатив)
// ---------------------------------------------------------------------------

export class Container<A> {
  private readonly _value: A;

  constructor(value: A) {
    this._value = value;
  }

  static of<A>(value: A): Container<A> {
    return new Container(value);
  }

  map<B>(fn: (a: A) => B): Container<B> {
    return Container.of(fn(this._value));
  }

  join(this: Container<Container<A>>): Container<A> {
    return this._value;
  }

  chain<B>(fn: (a: A) => Container<B>): Container<B> {
    return fn(this._value);
  }

  // ap: this содержит функцию, otherContainer содержит значение.
  // Применяем функцию из this к значению внутри otherContainer через map.
  ap<B>(this: Container<(a: A) => B>, other: Container<A>): Container<B> {
    return other.map(this._value);
  }

  get value(): A {
    return this._value;
  }

  inspect(): string {
    return `Container(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Maybe — безопасная работа с null / undefined
//
// ap: если this — Nothing, возвращаем Nothing (короткое замыкание).
// Иначе применяем функцию внутри this к значению внутри otherMaybe.
// ---------------------------------------------------------------------------

export class Maybe<A> {
  private readonly _value: A | null | undefined;

  constructor(value: A | null | undefined) {
    this._value = value;
  }

  // Overloads: Maybe.of(null) → Maybe<never>, Maybe.of(5) → Maybe<number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static of(value: null | undefined): Maybe<any>;
  static of<A>(value: A): Maybe<A>;
  static of<A>(value: A | null | undefined): Maybe<A> {
    return new Maybe(value);
  }

  get isNothing(): boolean {
    return this._value === null || this._value === undefined;
  }

  map<B>(fn: (a: A) => B): Maybe<B> {
    return this.isNothing ? (this as unknown as Maybe<B>) : Maybe.of(fn(this._value as A));
  }

  join(): Maybe<A> {
    if (this.isNothing) return this as unknown as Maybe<A>;
    return this._value as unknown as Maybe<A>;
  }

  chain<B>(fn: (a: A) => Maybe<B>): Maybe<B> {
    return this.isNothing ? (this as unknown as Maybe<B>) : fn(this._value as A);
  }

  // ap: если функция — Nothing, весь результат Nothing.
  // Если otherMaybe — Nothing, map вернёт Nothing сам по себе.
  ap<B>(this: Maybe<(a: A) => B>, other: Maybe<A>): Maybe<B> {
    return this.isNothing ? (this as unknown as Maybe<B>) : other.map(this._value as (a: A) => B);
  }

  getOrElse<B>(defaultValue: B): A | B {
    return this.isNothing ? defaultValue : (this._value as A);
  }

  filter(pred: (a: A) => boolean): Maybe<A> {
    return this.isNothing
      ? this
      : pred(this._value as A)
        ? this
        : Maybe.of<A>(null as unknown as A);
  }

  get value(): A | null | undefined {
    return this._value;
  }

  inspect(): string {
    return this.isNothing ? 'Maybe(null)' : `Maybe(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Either — обработка ошибок с сохранением контекста
//
// Right.ap: применяем функцию к otherEither через map.
// Left.ap:  ошибка уже произошла — возвращаем Left как есть.
// ---------------------------------------------------------------------------

export class Right<A> {
  private readonly _value: A;

  constructor(value: A) {
    this._value = value;
  }

  static of<A>(value: A): Right<A> {
    return new Right(value);
  }

  map<B>(fn: (a: A) => B): Right<B> {
    return Right.of(fn(this._value));
  }

  join(this: Right<Right<A>>): Right<A> {
    return this._value;
  }

  chain<B>(fn: (a: A) => Right<B>): Right<B> {
    return fn(this._value);
  }

  // ap: this содержит функцию (Right(fn)), применяем к otherEither
  ap<B, L>(this: Right<(a: A) => B>, other: Either<L, A>): Either<L, B> {
    return other.map(this._value);
  }

  getOrElse(_defaultValue: A): A {
    return this._value;
  }

  fold<B>(fnLeft: (e: any) => B, fnRight: (a: A) => B): B {
    return fnRight(this._value);
  }

  get value(): A {
    return this._value;
  }

  inspect(): string {
    return `Right(${this._value})`;
  }
}

export class Left<E> {
  private readonly _value: E;

  constructor(value: E) {
    this._value = value;
  }

  static of<E>(value: E): Left<E> {
    return new Left(value);
  }

  map<B>(_fn: (a: never) => B): Left<E> {
    return this;
  }

  join(): Left<E> {
    return this;
  }

  chain<B>(_fn: (a: never) => B): Left<E> {
    return this;
  }

  // ap: Left содержит ошибку, а не функцию. Пропускаем насквозь.
  ap<B>(_other: unknown): Left<E> {
    return this;
  }

  getOrElse<B>(defaultValue: B): B {
    return defaultValue;
  }

  fold<B>(fnLeft: (e: E) => B, _fnRight: (a: any) => B): B {
    return fnLeft(this._value);
  }

  get value(): E {
    return this._value;
  }

  inspect(): string {
    return `Left(${this._value})`;
  }
}

// Объединяющий тип для Either
export type Either<L, R> = Left<L> | Right<R>;

// ---------------------------------------------------------------------------
// IO — откладывание побочных эффектов
//
// ap: this._value() возвращает функцию, otherIO._value() возвращает значение.
// Создаём новый IO, который при запуске применит функцию к значению.
// ---------------------------------------------------------------------------

export class IO<A> {
  private readonly _value: () => A;

  constructor(fn: () => A) {
    this._value = fn;
  }

  static of<A>(value: A): IO<A> {
    return new IO(() => value);
  }

  map<B>(fn: (a: A) => B): IO<B> {
    return new IO(() => fn(this._value()));
  }

  join(): IO<A> {
    return new IO(() => (this._value() as unknown as IO<A>).unsafePerformIO());
  }

  chain<B>(fn: (a: A) => IO<B>): IO<B> {
    return new IO(() => fn(this._value()).unsafePerformIO());
  }

  // ap: запускаем оба IO и применяем функцию к значению
  ap<B>(this: IO<(a: A) => B>, other: IO<A>): IO<B> {
    return new IO(() => {
      const fn = this._value();
      const val = other._value();
      return fn(val);
    });
  }

  unsafePerformIO(): A {
    return this._value();
  }

  inspect(): string {
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

// Интерфейс для объектов, поддерживающих map и ap
interface Mappable<A> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map<B>(fn: (a: A) => B): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ap(other: any): any;
}

export const liftA2 = curry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A, B, C>(fn: (a: A) => (b: B) => C, f1: Mappable<A>, f2: Mappable<B>): any =>
    f1.map(fn).ap(f2)
);

export const liftA3 = curry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A, B, C, D>(fn: (a: A) => (b: B) => (c: C) => D, f1: Mappable<A>, f2: Mappable<B>, f3: Mappable<C>): any =>
    f1.map(fn).ap(f2).ap(f3)
);
