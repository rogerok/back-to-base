/**
 * containers.js — готовые реализации контейнеров для упражнений по монадам.
 *
 * Этот файл НЕ является упражнением.
 * Все контейнеры уже дополнены методами join и chain.
 *
 * Импортируй нужные классы в своих решениях:
 *   import { Container, Maybe, Right, Left, IO } from './containers.js';
 */

// ---------------------------------------------------------------------------
// Container — базовая обёртка (функтор)
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
//
// Новое в этой главе:
//   join()       — снимает один слой вложенности
//   chain(fn)    — map(fn).join() — применяет fn и разворачивает результат
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

  // join: если внутри ничего нет — возвращаем себя (Maybe(null))
  // если внутри что-то есть — возвращаем внутреннее значение как есть
  join() {
    return this.isNothing ? this : this._value;
  }

  // chain: применяем fn (она вернёт контейнер), затем убираем лишний слой
  chain(fn) {
    return this.map(fn).join();
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
//
// Right — "счастливый путь", значение передаётся дальше
// Left  — ошибка, chain и map игнорируют функцию и пропускают Left насквозь
//
// Новое в этой главе:
//   join()       — снимает обёртку Right (достаёт внутреннее значение)
//   chain(fn)    — map(fn).join()
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

  // join на Right просто отдаёт внутреннее значение
  join() {
    return this._value;
  }

  chain(fn) {
    return this.map(fn).join();
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

  // join на Left возвращает себя — ошибка не разворачивается
  join() {
    return this;
  }

  // chain на Left игнорирует функцию — ошибка проходит насквозь
  chain(_fn) {
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
// _value хранит функцию-"рецепт", а не готовое значение.
// Эффект выполняется только при вызове unsafePerformIO().
//
// Новое в этой главе:
//   join()       — объединяет IO(IO(x)) в один плоский IO(x)
//   chain(fn)    — map(fn).join()
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

  // join: внутри лежит IO, создаём новый IO, который запускает оба по цепочке
  join() {
    return new IO(() => this._value().unsafePerformIO());
  }

  chain(fn) {
    return this.map(fn).join();
  }

  unsafePerformIO() {
    return this._value();
  }

  inspect() {
    return 'IO(?)';
  }
}
