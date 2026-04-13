import { expect, it } from 'vitest';

/**
 * Упражнения к главе 11: Natural Transformations.
 *
 * Запуск после решения:
 *   npx tsx natural-transformations.ts
 *
 * В этом файле есть минимальные реализации Maybe, Either и Task, чтобы
 * упражнения можно было выполнять без внешних библиотек.
 */

class Maybe<A> {
  private constructor(private readonly value: A | null | undefined) {}

  static just<A>(value: A): Maybe<A> {
    return new Maybe(value);
  }

  static nothing<A>(): Maybe<A> {
    return new Maybe<A>(null);
  }

  static of<A>(value: A | null | undefined): Maybe<A> {
    return value === null || value === undefined ? Maybe.nothing<A>() : Maybe.just(value);
  }

  map<B>(fn: (value: A) => B): Maybe<B> {
    return this.value === null || this.value === undefined
      ? Maybe.nothing<B>()
      : Maybe.just(fn(this.value));
  }

  fold<B>(onNothing: () => B, onJust: (value: A) => B): B {
    return this.value === null || this.value === undefined ? onNothing() : onJust(this.value);
  }

  inspect(): string {
    return this.fold(() => 'Nothing', (value) => `Just(${JSON.stringify(value)})`);
  }
}

class Left<E> {
  readonly tag = 'Left';

  constructor(readonly error: E) {}

  map<B>(_fn: (value: never) => B): Either<E, B> {
    return new Left(this.error);
  }

  fold<B>(onLeft: (error: E) => B, _onRight: (value: never) => B): B {
    return onLeft(this.error);
  }

  inspect(): string {
    return `Left(${JSON.stringify(this.error)})`;
  }
}

class Right<A> {
  readonly tag = 'Right';

  constructor(readonly value: A) {}

  map<B>(fn: (value: A) => B): Either<never, B> {
    return new Right(fn(this.value));
  }

  fold<B>(_onLeft: (error: never) => B, onRight: (value: A) => B): B {
    return onRight(this.value);
  }

  inspect(): string {
    return `Right(${JSON.stringify(this.value)})`;
  }
}

type Either<E, A> = Left<E> | Right<A>;

const left = <E, A = never>(error: E): Either<E, A> => new Left(error);
const right = <A, E = never>(value: A): Either<E, A> => new Right(value);

class Task<E, A> {
  constructor(readonly fork: (reject: (error: E) => void, resolve: (value: A) => void) => void) {}

  static of<E = never, A = never>(value: A): Task<E, A> {
    return new Task((_reject, resolve) => resolve(value));
  }

  static rejected<E, A = never>(error: E): Task<E, A> {
    return new Task((reject) => reject(error));
  }

  map<B>(fn: (value: A) => B): Task<E, B> {
    return new Task((reject, resolve) => this.fork(reject, (value) => resolve(fn(value))));
  }

  chain<E2, B>(fn: (value: A) => Task<E2, B>): Task<E | E2, B> {
    return new Task((reject, resolve) => this.fork(reject, (value) => fn(value).fork(reject, resolve)));
  }
}

const runTask = <E, A>(task: Task<E, A>): Promise<Either<E, A>> =>
  new Promise((resolve) => {
    task.fork(
      (error) => resolve(left(error)),
      (value) => resolve(right(value))
    );
  });

// ---------------------------------------------------------------------------
// Exercise A: Either<E, A> -> Maybe<A>
// ---------------------------------------------------------------------------

const eitherToMaybe = <E, A>(_value: Either<E, A>): Maybe<A> => {
  // TODO:
  // - Left(error) -> Nothing
  // - Right(value) -> Just(value)
  return Maybe.nothing<A>();
};

// ---------------------------------------------------------------------------
// Exercise B: Either<E, A> -> Task<E, A>
// ---------------------------------------------------------------------------

const eitherToTask = <E, A>(_value: Either<E, A>): Task<E, A> => {
  // TODO:
  // - Left(error) -> Task.rejected(error)
  // - Right(value) -> Task.of(value)
  return Task.rejected('TODO: implement eitherToTask' as E);
};

// ---------------------------------------------------------------------------
// Exercise C: убрать вложенный Either внутри Task
// ---------------------------------------------------------------------------

type User = {
  id: number;
  name: string;
};

const users = new Map<number, User>([
  [1, { id: 1, name: 'Ada' }],
  [2, { id: 2, name: 'Haskell' }],
]);

const findUserById = (id: number): Task<string, Either<string, User>> =>
  Task.of(users.has(id) ? right(users.get(id) as User) : left(`User ${id} not found`));

const findNameById = (_id: number): Task<string, string> => {
  // TODO:
  // 1. findUserById(id)
  // 2. map по Task, чтобы внутри Either сделать user -> user.name
  // 3. chain(eitherToTask), чтобы избавиться от Either внутри Task
  return Task.rejected('TODO: implement findNameById');
};

// ---------------------------------------------------------------------------
// Exercise D: изоморфизм string <-> string[]
// ---------------------------------------------------------------------------

const strToList = (_value: string): string[] => {
  // TODO: превратить строку в массив символов
  return [];
};

const listToStr = (_chars: readonly string[]): string => {
  // TODO: собрать строку из массива символов
  return '';
};

// ---------------------------------------------------------------------------
// Exercise E: закон naturality для arrayToMaybe
// ---------------------------------------------------------------------------

const arrayToMaybe = <A>(items: readonly A[]): Maybe<A> =>
  items.length === 0 ? Maybe.nothing<A>() : Maybe.just(items[0]);

const checkNaturality = <A, B>(items: readonly A[], fn: (value: A) => B): boolean => {
  const leftSide = arrayToMaybe(items.map(fn)).inspect();
  const rightSide = arrayToMaybe(items).map(fn).inspect();

  return leftSide === rightSide;
};

// ---------------------------------------------------------------------------
// Тесты. Они начнут проходить после выполнения TODO выше.
// ---------------------------------------------------------------------------

const test = (description: string, actual: unknown, expected: unknown): void => {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
};

console.log('\n--- Exercise A: eitherToMaybe ---\n');
test('Right(42) -> Just(42)', eitherToMaybe(right(42)).inspect(), 'Just(42)');
test('Left(error) -> Nothing', eitherToMaybe(left('error')).inspect(), 'Nothing');

console.log('\n--- Exercise B: eitherToTask ---\n');
const rightTask = await runTask(eitherToTask(right('ok')));
const leftTask = await runTask(eitherToTask(left('bad')));
test('Right(ok) -> resolved Task', rightTask.inspect(), 'Right("ok")');
test('Left(bad) -> rejected Task', leftTask.inspect(), 'Left("bad")');

console.log('\n--- Exercise C: findNameById ---\n');
const existingName = await runTask(findNameById(1));
const missingName = await runTask(findNameById(404));
test('findNameById(1) -> Right(Ada)', existingName.inspect(), 'Right("Ada")');
test('findNameById(404) -> Left(User 404 not found)', missingName.inspect(), 'Left("User 404 not found")');

console.log('\n--- Exercise D: string <-> string[] ---\n');
test('strToList(fp)', JSON.stringify(strToList('fp')), JSON.stringify(['f', 'p']));
test('listToStr([f, p])', listToStr(['f', 'p']), 'fp');
test('round trip string', listToStr(strToList('natural')), 'natural');

console.log('\n--- Exercise E: naturality ---\n');
test('arrayToMaybe naturality for [1, 2, 3]', checkNaturality([1, 2, 3], (x) => x * 2), true);
test('arrayToMaybe naturality for []', checkNaturality<number, number>([], (x) => x * 2), true);
