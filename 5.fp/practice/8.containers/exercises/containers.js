/**
 * containers.js — готовые реализации контейнеров для упражнений.
 *
 * Этот файл НЕ является упражнением.
 * Импортируй нужные классы в своих решениях:
 *
 *   import { Container, Maybe, Right, Left, IO } from './containers.js';
 */

// ---------------------------------------------------------------------------
// Container — базовая обёртка
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

  inspect() {
    return `Container(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Maybe — безопасная работа с null / undefined
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

  getOrElse(defaultValue) {
    return this.isNothing ? defaultValue : this._value;
  }

  filter(pred) {
    return this.isNothing
      ? this
      : pred(this._value)
      ? this
      : Maybe.of(null);
  }

  inspect() {
    return this.isNothing ? 'Maybe(null)' : `Maybe(${this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Either — обработка ошибок с сохранением контекста
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
// ---------------------------------------------------------------------------

export class IO {
  constructor(fn) {
    // Всегда хранит функцию, а не значение
    this._value = fn;
  }

  static of(value) {
    return new IO(() => value);
  }

  map(fn) {
    return new IO(() => fn(this._value()));
  }

  unsafePerformIO() {
    return this._value();
  }

  inspect() {
    return 'IO(?)';
  }
}
