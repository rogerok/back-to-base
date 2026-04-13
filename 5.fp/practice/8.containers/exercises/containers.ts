/**
 * containers.ts — готовые реализации контейнеров для упражнений.
 *
 * Этот файл НЕ является упражнением.
 * Импортируй нужные классы в своих решениях:
 *
 *   import { Container, Maybe, Right, Left, IO } from './containers.ts';
 */

// ---------------------------------------------------------------------------
// Container — базовая обёртка
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

  get value(): A {
    return this._value;
  }

  inspect(): string {
    return `Container(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Maybe — безопасная работа с null / undefined
// ---------------------------------------------------------------------------

export class Maybe<A> {
  private readonly _value: A | null | undefined;

  constructor(value: A | null | undefined) {
    this._value = value;
  }

  static of<A>(value: A | null | undefined): Maybe<A> {
    return new Maybe(value);
  }

  get isNothing(): boolean {
    return this._value === null || this._value === undefined;
  }

  map<B>(fn: (a: A) => B): Maybe<B> {
    return this.isNothing ? (this as unknown as Maybe<B>) : Maybe.of(fn(this._value as A));
  }

  getOrElse<B>(defaultValue: B): A | B {
    return this.isNothing ? defaultValue : (this._value as A);
  }

  filter(pred: (a: A) => boolean): Maybe<A> {
    if (this.isNothing) return this;
    return pred(this._value as A) ? this : Maybe.of<A>(null);
  }

  inspect(): string {
    return this.isNothing ? 'Maybe(null)' : `Maybe(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Either — обработка ошибок с сохранением контекста
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

  getOrElse(_defaultValue: A): A {
    return this._value;
  }

  fold<B>(_fnLeft: (a: unknown) => B, fnRight: (a: A) => B): B {
    return fnRight(this._value);
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

  getOrElse<A>(defaultValue: A): A {
    return defaultValue;
  }

  fold<B>(fnLeft: (e: E) => B, _fnRight: (a: any) => B): B {
    return fnLeft(this._value);
  }

  inspect(): string {
    return `Left(${this._value})`;
  }
}

// Вспомогательный union-тип для Either
export type Either<L, R> = Left<L> | Right<R>;

// ---------------------------------------------------------------------------
// IO — откладывание побочных эффектов
// ---------------------------------------------------------------------------

export class IO<A> {
  // Всегда хранит функцию, а не значение
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

  unsafePerformIO(): A {
    return this._value();
  }

  inspect(): string {
    return 'IO(?)';
  }
}
