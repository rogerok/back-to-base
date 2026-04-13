import { expect, it } from 'vitest';

/**
 * Упражнения к главе 12: Traversable.
 *
 * Запуск после решения:
 *   npx tsx traversable.ts
 *
 * В этом файле есть минимальные реализации Maybe, Either, Task и IO, чтобы
 * упражнения можно было выполнять без внешних библиотек.
 *
 * Ключевая идея главы: traverse / sequence «переворачивают» вложенность
 * контейнеров, собирая эффекты.
 *
 *   Array<Maybe<A>>  --sequence-->  Maybe<Array<A>>
 *   Array<Task<E,A>> --sequence-->  Task<E, Array<A>>
 *   Map<K, Task<E,A>> --traverse--> Task<E, Map<K,A>>
 */

// ===========================================================================
// Контейнеры
// ===========================================================================

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

  isNothing(): boolean {
    return this.value === null || this.value === undefined;
  }

  map<B>(fn: (value: A) => B): Maybe<B> {
    return this.isNothing() ? Maybe.nothing<B>() : Maybe.just(fn(this.value as A));
  }

  // ap применяет функцию внутри Maybe к значению внутри this
  ap<B>(fab: Maybe<(a: A) => B>): Maybe<B> {
    return fab.fold(
      () => Maybe.nothing<B>(),
      (fn) => this.map(fn)
    );
  }

  fold<B>(onNothing: () => B, onJust: (value: A) => B): B {
    return this.isNothing() ? onNothing() : onJust(this.value as A);
  }

  inspect(): string {
    return this.fold(() => 'Nothing', (value) => `Just(${JSON.stringify(value)})`);
  }
}

// ---------------------------------------------------------------------------

class Left<E> {
  readonly tag = 'Left' as const;

  constructor(readonly error: E) {}

  map<B>(_fn: (value: never) => B): Either<E, B> {
    return new Left(this.error);
  }

  ap<B>(_fab: Either<E, (a: never) => B>): Either<E, B> {
    return new Left(this.error);
  }

  fold<B>(onLeft: (error: E) => B, _onRight: (value: never) => B): B {
    return onLeft(this.error);
  }

  // sequence: Left<E> содержит эффект типа F<Left<E,A>>
  // Для Left sequence просто оборачивает Left в F с помощью of
  sequence<F>(of: <T>(v: T) => F): F {
    return of(this as Left<E>);
  }

  inspect(): string {
    return `Left(${JSON.stringify(this.error)})`;
  }
}

class Right<A> {
  readonly tag = 'Right' as const;

  constructor(readonly value: A) {}

  map<B>(fn: (value: A) => B): Either<never, B> {
    return new Right(fn(this.value));
  }

  ap<E, B>(fab: Either<E, (a: A) => B>): Either<E, B> {
    return fab.fold(
      (e) => new Left(e),
      (fn) => new Right(fn(this.value))
    );
  }

  fold<B>(_onLeft: (error: never) => B, onRight: (value: A) => B): B {
    return onRight(this.value);
  }

  // sequence: Right<F<A>> -> F<Right<A>>
  // Логика реализуется в упражнении D через отдельные функции
  sequence(of: <T>(v: T) => any): any {
    // this.value — внутренний функтор (например, Maybe<A>)
    // map по нему, оборачивая значение обратно в Right
    return (this.value as any).map((a: any) => new Right(a));
  }

  inspect(): string {
    return `Right(${JSON.stringify(this.value)})`;
  }
}

type Either<E, A> = Left<E> | Right<A>;

const left = <E, A = never>(error: E): Either<E, A> => new Left(error);
const right = <A, E = never>(value: A): Either<E, A> => new Right(value);

// ---------------------------------------------------------------------------

class Task<E, A> {
  constructor(
    readonly fork: (reject: (error: E) => void, resolve: (value: A) => void) => void
  ) {}

  static of<E = never, A = never>(value: A): Task<E, A> {
    return new Task((_reject, resolve) => resolve(value));
  }

  static rejected<E, A = never>(error: E): Task<E, A> {
    return new Task((reject) => reject(error));
  }

  map<B>(fn: (value: A) => B): Task<E, B> {
    return new Task((reject, resolve) =>
      this.fork(reject, (value) => resolve(fn(value)))
    );
  }

  chain<E2, B>(fn: (value: A) => Task<E2, B>): Task<E | E2, B> {
    return new Task((reject, resolve) =>
      this.fork(reject, (value) => fn(value).fork(reject as (e: E | E2) => void, resolve))
    );
  }

  // ap применяет Task с функцией к Task со значением (параллельно)
  ap<B>(taskFn: Task<E, (a: A) => B>): Task<E, B> {
    return new Task((reject, resolve) => {
      let fn: ((a: A) => B) | undefined;
      let val: A | undefined;
      let fnDone = false;
      let valDone = false;
      let isRejected = false;

      const tryResolve = () => {
        if (fnDone && valDone && !isRejected) {
          resolve(fn!(val!));
        }
      };

      taskFn.fork(
        (e) => {
          if (!isRejected) {
            isRejected = true;
            reject(e);
          }
        },
        (f) => {
          fn = f;
          fnDone = true;
          tryResolve();
        }
      );

      this.fork(
        (e) => {
          if (!isRejected) {
            isRejected = true;
            reject(e);
          }
        },
        (v) => {
          val = v;
          valDone = true;
          tryResolve();
        }
      );
    });
  }
}

// ---------------------------------------------------------------------------

class IO<A> {
  constructor(private readonly effect: () => A) {}

  static of<A>(value: A): IO<A> {
    return new IO(() => value);
  }

  map<B>(fn: (value: A) => B): IO<B> {
    return new IO(() => fn(this.effect()));
  }

  chain<B>(fn: (value: A) => IO<B>): IO<B> {
    return new IO(() => fn(this.effect()).run());
  }

  run(): A {
    return this.effect();
  }

  inspect(): string {
    return `IO(${String(this.effect)})`;
  }
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

const runTask = <E, A>(task: Task<E, A>): Promise<Either<E, A>> =>
  new Promise((resolve) => {
    task.fork(
      (error) => resolve(left(error)),
      (value) => resolve(right(value))
    );
  });

// ===========================================================================
// Exercise A: sequence для массива Maybe
// ===========================================================================
// Дан массив Maybe-значений. Реализуй функцию sequenceMaybe, которая
// превращает Array<Maybe<A>> в Maybe<Array<A>>.
//
// Правило: если хотя бы одно значение — Nothing, результат — Nothing.
// Иначе — Just со всеми значениями.
//
// Подсказка: используй reduce + map + ap
//   Начальный аккумулятор: Maybe.just([])
//   На каждом шаге: currentMaybe.ap(acc.map(arr => (x: A) => [...arr, x]))

const sequenceMaybe = <A>(_maybes: Array<Maybe<A>>): Maybe<Array<A>> => {
  // TODO:
  // Используй reduce. Начальное значение: Maybe.just([] as A[])
  // На каждом шаге добавляй текущий элемент к накопленному массиву.
  // Если хотя бы один элемент — Nothing, весь результат должен стать Nothing.
  //
  // В нашей реализации: value.ap(fab) — применяет функцию из fab к значению в value
  //
  // Шаблон:
  //   const appendTo = (arr: A[]) => (x: A) => [...arr, x];
  //   currentMaybe.ap(acc.map(appendTo))
  return Maybe.nothing<Array<A>>();
};

// ===========================================================================
// Exercise B: traverse для валидации массива игроков
// ===========================================================================
// Дан список игроков. Функция validate проверяет каждого.
// Реализуй traverseValidate, которая возвращает либо первую ошибку (Left),
// либо Right со списком всех прошедших валидацию игроков.
//
// Это классический «всё или ничего» паттерн с traverse.

type Player = { name: string; score: number };

const validate = (player: Player): Either<string, Player> => {
  if (!player.name || player.name.trim() === '') {
    return left('Имя игрока не может быть пустым');
  }
  if (player.score < 0) {
    return left(`Счёт игрока "${player.name}" не может быть отрицательным`);
  }
  return right(player);
};

const traverseValidate = (_players: Player[]): Either<string, Player[]> => {
  // TODO:
  // Используй reduce. Начальное значение: right([] as Player[])
  // На каждом шаге:
  //   1. Вызови validate(player) для текущего игрока
  //   2. Если Either уже Left — пробрось Left дальше
  //   3. Если Right — добавь игрока к накопленному массиву
  //
  // Подсказка: currentEither.ap(acc.map(arr => p => [...arr, p]))
  // Метод ap на Right/Left уже реализован выше.
  return left('TODO: реализуй traverseValidate');
};

// ===========================================================================
// Exercise C: readFirst — чтение первого файла из директории
// ===========================================================================
// Дана имитация файловой системы. readdir возвращает Task<string, string[]>.
// readfile возвращает Task<string, Maybe<string>>.
//
// Реализуй readFirst, которая:
//   1. Читает список файлов директории
//   2. Берёт первый файл (используй Maybe.of(files[0]))
//   3. Если файлов нет — возвращает Task.of(Maybe.nothing())
//   4. Если файл есть — читает его содержимое
//
// Тип результата: Task<string, Maybe<string>>
//
// Подсказка: traverse позволяет «пробросить» эффект Task через Maybe.
// Maybe<Task<E,A>> -> Task<E, Maybe<A>>
//
// Шаблон traverseMaybe (для Maybe<Task<E,A>> -> Task<E, Maybe<A>>):
//   nothing -> Task.of(Maybe.nothing())
//   just(task) -> task.map(a => Maybe.just(a))

const fakeFs = new Map<string, string>([
  ['/app/index.ts', 'export default 42;'],
  ['/app/utils.ts', 'export const add = (a: number, b: number) => a + b;'],
  ['/empty/', ''],
]);

const fakeDirs = new Map<string, string[]>([
  ['/app/', ['index.ts', 'utils.ts']],
  ['/empty/', []],
]);

const readfile = (path: string): Task<string, Maybe<string>> =>
  new Task((_reject, resolve) => {
    const content = fakeFs.get(path);
    resolve(Maybe.of(content));
  });

const readdir = (path: string): Task<string, string[]> =>
  new Task((reject, resolve) => {
    const files = fakeDirs.get(path);
    if (files === undefined) {
      reject(`Директория не найдена: ${path}`);
    } else {
      resolve(files);
    }
  });

const readFirst = (_dir: string): Task<string, Maybe<string>> => {
  // TODO:
  // 1. readdir(dir) — получи список файлов
  // 2. .map(files => Maybe.of(files[0])) — возьми первый файл как Maybe
  // 3. .chain(maybeFile => traverseMaybe(maybeFile, name => readfile(dir + name)))
  //    где traverseMaybe :: Maybe<A> -> (A -> Task<E,B>) -> Task<E, Maybe<B>>
  //
  // traverseMaybe реализуй inline или как вспомогательную функцию:
  // Внимание: readfile уже возвращает Task<string, Maybe<string>>.
  // Поэтому traverse просто «разворачивает» Maybe снаружи Task:
  //   maybeFile.fold(
  //     () => Task.of(Maybe.nothing<string>()),
  //     (name) => readfile(dir + name)
  //   )
  return Task.rejected('TODO: реализуй readFirst');
};

// ===========================================================================
// Exercise D: sequence на Right/Left
// ===========================================================================
// Метод sequence на Right уже объявлен выше с TODO внутри.
// Реализуй его тело в классе Right так, чтобы:
//
//   Right(Maybe.just(42)).sequenceD(Maybe.of)
//     -> Maybe.just(Right(42))   // Just(Right(42))
//
//   Right(Maybe.nothing()).sequenceD(Maybe.of)
//     -> Maybe.nothing()         // Nothing
//
//   Left('ошибка').sequenceD(Maybe.of)
//     -> Maybe.just(Left('ошибка'))
//
// Для удобства тестирования используем отдельные функции ниже,
// которые вызывают логику sequence вручную.

// sequenceRight :: Right<Maybe<A>> -> Maybe<Right<A>>
const sequenceRight = <A>(rightMaybe: Right<Maybe<A>>): Maybe<Right<A>> => {
  // TODO:
  // rightMaybe.value — это Maybe<A>
  // Нужно сделать map по Maybe, завернув каждое значение в Right
  // Подсказка: rightMaybe.value.map(a => new Right(a))
  return Maybe.nothing<Right<A>>();
};

// sequenceLeft :: Left<E> -> Maybe<Left<E>>   (всегда Just(Left(e)))
const sequenceLeft = <E>(l: Left<E>): Maybe<Left<E>> => {
  // TODO:
  // Left не содержит никакого внутреннего Maybe-эффекта.
  // sequence для Left просто оборачивает Left в Maybe.just.
  return Maybe.nothing<Left<E>>();
};

// ===========================================================================
// Exercise E: traverse для Map
// ===========================================================================
// Дан Map<string, string>, где ключ — название маршрута, значение — URL.
// httpGet симулирует запрос и возвращает Task<string, string>.
//
// Реализуй traverseMap, которая применяет функцию к каждому значению Map
// и собирает результаты в Task<E, Map<K, B>>.
//
// Если хотя бы один Task упадёт — весь результат должен упасть.

const httpGet = (url: string): Task<string, string> => {
  const responses = new Map<string, string>([
    ['https://api.example.com/users', '{"users":[]}'],
    ['https://api.example.com/posts', '{"posts":[]}'],
    ['https://api.example.com/comments', '{"comments":[]}'],
  ]);

  return new Task((reject, resolve) => {
    const body = responses.get(url);
    if (body === undefined) {
      reject(`404: ${url}`);
    } else {
      resolve(body);
    }
  });
};

const traverseMap = <K, A, E, B>(
  _map: Map<K, A>,
  _fn: (value: A) => Task<E, B>
): Task<E, Map<K, B>> => {
  // TODO:
  // Алгоритм:
  //   1. Начальный аккумулятор: Task.of(new Map<K, B>())
  //   2. Для каждой пары [key, value] в _map:
  //      a. Вызови _fn(value) — получи Task<E, B>
  //      b. Соедини с аккумулятором через ap или chain:
  //         acc.chain(accMap =>
  //           _fn(value).map(b => new Map([...accMap, [key, b]]))
  //         )
  //   3. Верни финальный Task
  //
  // Подсказка: используй Array.from(_map.entries()) и reduce
  return Task.rejected('TODO: реализуй traverseMap' as unknown as E);
};

// ===========================================================================
// Тесты. Они начнут проходить после выполнения TODO выше.
// ===========================================================================

const test = (description: string, actual: unknown, expected: unknown): void => {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
};

// ---------------------------------------------------------------------------
console.log('\n--- Exercise A: sequenceMaybe ---\n');

test(
  'все Just -> Just со всеми значениями',
  sequenceMaybe([Maybe.just(1), Maybe.just(2), Maybe.just(3)]).inspect(),
  'Just([1,2,3])'
);

test(
  'один Nothing -> Nothing',
  sequenceMaybe([Maybe.just(1), Maybe.nothing<number>(), Maybe.just(3)]).inspect(),
  'Nothing'
);

test(
  'пустой массив -> Just([])',
  sequenceMaybe([]).inspect(),
  'Just([])'
);

test(
  'все Nothing -> Nothing',
  sequenceMaybe([Maybe.nothing<number>(), Maybe.nothing<number>()]).inspect(),
  'Nothing'
);

// ---------------------------------------------------------------------------
console.log('\n--- Exercise B: traverseValidate ---\n');

const validPlayers: Player[] = [
  { name: 'Alice', score: 100 },
  { name: 'Bob', score: 200 },
];

const invalidPlayers: Player[] = [
  { name: 'Alice', score: 100 },
  { name: '', score: 50 },
  { name: 'Carol', score: 300 },
];

const negativePlayers: Player[] = [
  { name: 'Dave', score: -10 },
];

test(
  'все валидны -> Right со списком',
  traverseValidate(validPlayers).fold(
    (e) => `Error: ${e}`,
    (ps) => `OK:${ps.map((p) => p.name).join(',')}`
  ),
  'OK:Alice,Bob'
);

test(
  'пустое имя -> Left с ошибкой',
  traverseValidate(invalidPlayers).fold(
    (e) => e,
    () => 'неожиданный успех'
  ),
  'Имя игрока не может быть пустым'
);

test(
  'отрицательный счёт -> Left с ошибкой',
  traverseValidate(negativePlayers).fold(
    (e) => e,
    () => 'неожиданный успех'
  ),
  'Счёт игрока "Dave" не может быть отрицательным'
);

test(
  'пустой список -> Right([])',
  traverseValidate([]).fold(
    (e) => `Error: ${e}`,
    (ps) => `OK:${ps.length}`
  ),
  'OK:0'
);

// ---------------------------------------------------------------------------
console.log('\n--- Exercise C: readFirst ---\n');

const firstOfApp = await runTask(readFirst('/app/'));
const firstOfEmpty = await runTask(readFirst('/empty/'));
const firstOfMissing = await runTask(readFirst('/missing/'));

test(
  '/app/ -> Right(Just(содержимое index.ts))',
  firstOfApp.fold(
    (e) => `Error: ${e}`,
    (m) => m.fold(() => 'Nothing', (v) => `Just(${v.slice(0, 6)})`)
  ),
  'Just(export)'
);

test(
  '/empty/ -> Right(Nothing)',
  firstOfEmpty.fold(
    (e) => `Error: ${e}`,
    (m) => m.inspect()
  ),
  'Nothing'
);

test(
  '/missing/ -> Left с ошибкой',
  firstOfMissing.fold(
    (e) => e,
    () => 'неожиданный успех'
  ),
  'Директория не найдена: /missing/'
);

// ---------------------------------------------------------------------------
console.log('\n--- Exercise D: sequence для Either ---\n');

const rightJust = new Right(Maybe.just(42));
const rightNothing = new Right(Maybe.nothing<number>());
const leftVal = new Left('ошибка');

test(
  'Right(Just(42)) -> Just(Right(42))',
  sequenceRight(rightJust).fold(
    () => 'Nothing',
    (r) => r.inspect()
  ),
  'Right(42)'
);

test(
  'Right(Nothing) -> Nothing',
  sequenceRight(rightNothing).inspect(),
  'Nothing'
);

test(
  'Left(ошибка) -> Just(Left(ошибка))',
  sequenceLeft(leftVal).fold(
    () => 'Nothing',
    (l) => l.inspect()
  ),
  'Left("ошибка")'
);

// ---------------------------------------------------------------------------
console.log('\n--- Exercise E: traverseMap ---\n');

const routes = new Map([
  ['users', 'https://api.example.com/users'],
  ['posts', 'https://api.example.com/posts'],
]);

const badRoutes = new Map([
  ['users', 'https://api.example.com/users'],
  ['missing', 'https://api.example.com/nope'],
]);

const goodResult = await runTask(traverseMap(routes, httpGet));
const badResult = await runTask(traverseMap(badRoutes, httpGet));

test(
  'все URL существуют -> Right с Map результатов',
  goodResult.fold(
    (e) => `Error: ${e}`,
    (m) => `OK:${[...m.keys()].sort().join(',')}`
  ),
  'OK:posts,users'
);

test(
  'один URL не найден -> Left с ошибкой',
  badResult.fold(
    (e) => e,
    () => 'неожиданный успех'
  ),
  '404: https://api.example.com/nope'
);

test(
  'содержимое ответа для users корректно',
  goodResult.fold(
    () => 'error',
    (m) => m.get('users') ?? 'missing'
  ),
  '{"users":[]}'
);

test(
  'пустой Map -> Right(пустой Map)',
  (await runTask(traverseMap(new Map<string, string>(), httpGet))).fold(
    (e) => `Error: ${e}`,
    (m) => `OK:${m.size}`
  ),
  'OK:0'
);
