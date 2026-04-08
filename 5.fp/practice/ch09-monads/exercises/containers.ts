/**
 * containers.ts — готовые реализации контейнеров для упражнений по монадам.
 *
 * Этот файл НЕ является упражнением.
 * Все контейнеры уже дополнены методами join и chain.
 *
 * Импортируй нужные классы в своих решениях:
 *   import { Container, Maybe, Right, Left, IO } from './containers.ts';
 */

// ---------------------------------------------------------------------------
// Container — базовая обёртка (функтор)
// ---------------------------------------------------------------------------

export class Container<A> {
  // readonly (не private) — тесты читают _value напрямую
  readonly _value: A;

  constructor(value: A) {
    this._value = value;
  }

  static of<A>(value: A): Container<A> {
    return new Container(value);
  }

  map<B>(fn: (a: A) => B): Container<B> {
    return Container.of(fn(this._value));
  }

  inspect(): string {
    return `Container(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Maybe — безопасная работа с null / undefined
//
// Новое в этой главе:
//   join()       — снимает один слой вложенности
//   chain(fn)    — map(fn).join() — применяет fn и разворачивает результат
// ---------------------------------------------------------------------------

export class Maybe<A> {
  // readonly (не private) — тесты читают _value напрямую
  readonly _value: A | null | undefined;

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

  // join: если внутри ничего нет — возвращаем себя (Maybe(null))
  // если внутри что-то есть — возвращаем внутреннее значение как есть
  join(): A extends Maybe<infer Inner> ? Maybe<Inner> : A {
    if (this.isNothing) {
      return this as unknown as A extends Maybe<infer Inner> ? Maybe<Inner> : A;
    }
    return this._value as unknown as A extends Maybe<infer Inner> ? Maybe<Inner> : A;
  }

  // chain: применяем fn (она вернёт контейнер), затем убираем лишний слой
  chain<B>(fn: (a: A) => Maybe<B>): Maybe<B> {
    return this.isNothing ? (this as unknown as Maybe<B>) : fn(this._value as A);
  }

  getOrElse<B>(defaultValue: B): A | B {
    return this.isNothing ? defaultValue : (this._value as A);
  }

  filter(pred: (a: A) => boolean): Maybe<A> {
    if (this.isNothing) return this;
    return pred(this._value as A) ? this : Maybe.of<A>(null as unknown as A);
  }

  inspect(): string {
    return this.isNothing ? 'Maybe(null)' : `Maybe(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Either — обработка ошибок с сохранением контекста
//
// Right — "счастливый путь", значение передаётся дальше
// Left  — ошибка, chain и map игнорируют функцию и пропускают Left насквозь
//
// Новое в этой главе:
//   join()       — снимает обёртку Right (достаёт внутреннее значение)
//   chain(fn)    — map(fn).join()
// ---------------------------------------------------------------------------

export class Right<A> {
  readonly _value: A;

  constructor(value: A) {
    this._value = value;
  }

  static of<A>(value: A): Right<A> {
    return new Right(value);
  }

  map<B>(fn: (a: A) => B): Right<B> {
    return Right.of(fn(this._value));
  }

  // join на Right просто отдаёт внутреннее значение
  join(): A {
    return this._value;
  }

  chain<L, B>(fn: (a: A) => Either<L, B>): Either<L, B> {
    return fn(this._value);
  }

  getOrElse<B>(_defaultValue: B): A {
    return this._value;
  }

  fold<B>(_fnLeft: (l: any) => B, fnRight: (a: A) => B): B {
    return fnRight(this._value);
  }

  inspect(): string {
    return `Right(${this._value})`;
  }
}

export class Left<L> {
  readonly _value: L;

  constructor(value: L) {
    this._value = value;
  }

  static of<L>(value: L): Left<L> {
    return new Left(value);
  }

  // Параметр fn принимает unknown — Left его игнорирует,
  // но сигнатура должна быть совместима при работе через union Either<L, R>.
  map<B>(_fn: (a: unknown) => B): Left<L> {
    return this;
  }

  // join на Left возвращает себя — ошибка не разворачивается
  join(): Left<L> {
    return this;
  }

  // chain на Left игнорирует функцию — ошибка проходит насквозь
  chain<B>(_fn: (a: unknown) => B): Left<L> {
    return this;
  }

  getOrElse<B>(defaultValue: B): B {
    return defaultValue;
  }

  fold<B>(fnLeft: (l: L) => B, _fnRight: (a: any) => B): B {
    return fnLeft(this._value);
  }

  inspect(): string {
    return `Left(${this._value})`;
  }
}

// Объединённый тип Either
export type Either<L, R> = Left<L> | Right<R>;

// ---------------------------------------------------------------------------
// IO — откладывание побочных эффектов
//
// _value хранит функцию-"рецепт", а не готовое значение.
// Эффект выполняется только при вызове unsafePerformIO().
//
// Новое в этой главе:
//   join()       — объединяет IO(IO(x)) в один плоский IO(x)
//   chain(fn)    — map(fn).join()
// ---------------------------------------------------------------------------

export class IO<A> {
  readonly _value: () => A;

  constructor(fn: () => A) {
    this._value = fn;
  }

  static of<A>(value: A): IO<A> {
    return new IO(() => value);
  }

  map<B>(fn: (a: A) => B): IO<B> {
    return new IO(() => fn(this._value()));
  }

  // join: внутри лежит IO, создаём новый IO, который запускает оба по цепочке
  join(): A extends IO<infer Inner> ? IO<Inner> : never {
    return new IO(
      () => (this._value() as unknown as IO<unknown>).unsafePerformIO()
    ) as A extends IO<infer Inner> ? IO<Inner> : never;
  }

  chain<B>(fn: (a: A) => IO<B>): IO<B> {
    return new IO(() => fn(this._value()).unsafePerformIO());
  }

  unsafePerformIO(): A {
    return this._value();
  }

  inspect(): string {
    return 'IO(?)';
  }
}
