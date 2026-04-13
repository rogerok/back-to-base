import { expect, it } from 'vitest';

/**
 * Упражнение 5: Реальный пайплайн — IO + Either + Maybe
 * Сложность: сложная
 *
 * Задача:
 *   Собрать полный пайплайн загрузки и применения темы оформления.
 *   Каждый шаг использует подходящий контейнер:
 *     IO      — для чтения/записи (чтение конфига, применение темы)
 *     Either  — для операций, которые могут завершиться ошибкой (парсинг JSON, валидация)
 *     Maybe   — для необязательных полей (тема может отсутствовать)
 *
 *   Цепочка шагов:
 *     1. IO:     читаем строку конфига из хранилища
 *     2. Either: парсим JSON (может упасть)
 *     3. Maybe:  извлекаем поле theme (может отсутствовать)
 *     4. Either: валидируем значение темы (только 'light' | 'dark' | 'system')
 *     5. IO:     применяем тему — пишем в DOM
 *
 *   Главная сложность: нужно переключаться между типами контейнеров.
 *   Для этого понадобится вспомогательная функция tryCatch и умение
 *   "вынуть" значение из одного контейнера и положить в другой.
 *
 * Запуск:
 *   npx tsx exercise-5.ts
 */

import { Maybe, Right, Left, IO, type Either } from './containers.ts';

// ---------------------------------------------------------------------------
// Вспомогательные инструменты — уже реализованы
// ---------------------------------------------------------------------------

interface Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface DOMSim {
  getAttribute: (id: string, attr: string) => string | null;
  setAttribute: (id: string, attr: string, value: string) => void;
}

// Симулированное хранилище
const createStorage = (initial: Record<string, string> = {}): Storage => {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
  };
};

// Симулированный DOM
const createDOM = (): DOMSim => {
  const state: Record<string, string> = {};
  return {
    getAttribute: (id, attr) => state[`${id}:${attr}`] ?? null,
    setAttribute: (id, attr, value) => { state[`${id}:${attr}`] = String(value); },
  };
};

// Безопасный доступ к свойству объекта — возвращает Maybe.
// Принимает unknown — чтобы работать в chain после любого предыдущего шага.
const safeProp =
  (key: string) =>
  (obj: unknown): Maybe<unknown> =>
    Maybe.of(obj == null ? null : (obj as Record<string, unknown>)[key]);

// ---------------------------------------------------------------------------
// Задание 5.1 — tryCatch
//
// Напиши функцию tryCatch(fn), которая:
//   — принимает функцию fn, которая может бросить исключение
//   — возвращает Either:
//       Right(результат) если fn выполнилась без ошибок
//       Left(error)      если fn бросила исключение
//
// Это стандартный паттерн для "оборачивания" небезопасного кода в Either.
//
// Пример:
//   tryCatch(() => JSON.parse('{"a":1}'))  → Right({ a: 1 })
//   tryCatch(() => JSON.parse('bad json')) → Left(SyntaxError: ...)
//   tryCatch(() => { throw new Error('oops') }) → Left(Error: oops)
// ---------------------------------------------------------------------------

const tryCatch = <A>(fn: () => A): Either<Error, A> => {
  // TODO: try { return Right.of(fn()); } catch (e) { return Left.of(e); }
  return undefined as unknown as Either<Error, A>;
};

// ---------------------------------------------------------------------------
// Задание 5.2 — parseConfig
//
// Напиши функцию parseConfig(str), которая:
//   — принимает строку (или null)
//   — возвращает Either:
//       Right(объект) при успешном парсинге
//       Left('Конфиг не найден') если str равно null
//       Left('Некорректный JSON: ...сообщение...') при ошибке парсинга
//
// Используй tryCatch внутри.
//
// Пример:
//   parseConfig('{"theme":"dark"}') → Right({ theme: 'dark' })
//   parseConfig(null)               → Left('Конфиг не найден')
//   parseConfig('not json')         → Left('Некорректный JSON: ...')
// ---------------------------------------------------------------------------

const parseConfig = (str: string | null): Either<string, Record<string, unknown>> => {
  // TODO:
  // if (str === null) return Left.of('Конфиг не найден');
  // return tryCatch(() => JSON.parse(str)).fold(
  //   (err) => Left.of(`Некорректный JSON: ${err.message}`),
  //   (obj) => Right.of(obj)
  // );
  return undefined as unknown as Either<string, Record<string, unknown>>;
};

// ---------------------------------------------------------------------------
// Задание 5.3 — extractTheme
//
// Напиши функцию extractTheme(config), которая:
//   — принимает объект конфига
//   — возвращает Either:
//       Right(значение темы) если поле theme присутствует
//       Left('Тема не указана в конфиге') если поле theme отсутствует
//
// Используй safeProp и Maybe для извлечения, затем конвертируй в Either.
//
// Подсказка: Maybe можно "конвертировать" в Either через fold или getOrElse:
//   safeProp('theme')(config)
//     .map(theme => Right.of(theme))
//     .getOrElse(Left.of('Тема не указана в конфиге'))
//
// Пример:
//   extractTheme({ theme: 'dark', lang: 'ru' })  → Right('dark')
//   extractTheme({ lang: 'ru' })                  → Left('Тема не указана в конфиге')
//   extractTheme({})                              → Left('Тема не указана в конфиге')
// ---------------------------------------------------------------------------

const extractTheme = (config: Record<string, unknown>): Either<string, unknown> => {
  // TODO
  return undefined as unknown as Either<string, unknown>;
};

// ---------------------------------------------------------------------------
// Задание 5.4 — validateTheme
//
// Напиши функцию validateTheme(theme), которая:
//   — принимает строку
//   — возвращает Either:
//       Right(theme) если значение одно из: 'light', 'dark', 'system'
//       Left('Недопустимая тема: "значение". Допустимы: light, dark, system')
//
// Пример:
//   validateTheme('dark')    → Right('dark')
//   validateTheme('light')   → Right('light')
//   validateTheme('system')  → Right('system')
//   validateTheme('purple')  → Left('Недопустимая тема: "purple". Допустимы: light, dark, system')
//   validateTheme('')        → Left('Недопустимая тема: "". Допустимы: light, dark, system')
// ---------------------------------------------------------------------------

type AllowedTheme = 'light' | 'dark' | 'system';
const ALLOWED_THEMES: AllowedTheme[] = ['light', 'dark', 'system'];

const validateTheme = (theme: unknown): Either<string, AllowedTheme> => {
  // TODO
  return undefined as unknown as Either<string, AllowedTheme>;
};

// ---------------------------------------------------------------------------
// Задание 5.5 — applyTheme
//
// Напиши функцию applyTheme(dom, theme), которая возвращает IO.
// При запуске IO устанавливает атрибут 'data-theme' элемента 'body' в значение theme.
// IO возвращает theme (чтобы можно было продолжать цепочку).
//
// Используй dom.setAttribute('body', 'data-theme', theme).
//
// Пример:
//   const dom = createDOM();
//   applyTheme(dom, 'dark').unsafePerformIO();
//   dom.getAttribute('body', 'data-theme') === 'dark'
// ---------------------------------------------------------------------------

const applyTheme = (dom: DOMSim, theme: AllowedTheme): IO<AllowedTheme> => {
  // TODO: new IO(() => { dom.setAttribute('body', 'data-theme', theme); return theme; })
  return undefined as unknown as IO<AllowedTheme>;
};

// ---------------------------------------------------------------------------
// Задание 5.6 — loadAndApplyTheme (главный пайплайн)
//
// Напиши функцию loadAndApplyTheme(storage, dom), которая:
//   1. Читает конфиг из storage по ключу 'config'              (IO)
//   2. Парсит JSON                                             (Either)
//   3. Извлекает поле theme                                    (Either)
//   4. Валидирует тему                                         (Either)
//   5. Применяет тему в DOM                                    (IO)
//   6. Возвращает строку с результатом:
//       'Тема применена: dark'  при успехе
//       'Ошибка: ...'           при любой ошибке
//
// Функция возвращает IO (весь пайплайн отложен до unsafePerformIO()).
//
// Архитектурная проблема и её решение:
//   Шаги 1 и 5 — IO. Шаги 2–4 — Either.
//   Нельзя напрямую chain IO с Either.
//
//   Решение: внутри chain IO-а передай значение через Either-пайплайн
//   и используй .fold() чтобы выйти из Either обратно в "плоский" мир:
//
//   readIO.chain(configStr => {
//     const result = parseConfig(configStr)
//       .chain(extractTheme)
//       .chain(validateTheme)
//       .fold(
//         (err) => IO.of(`Ошибка: ${err}`),     // Left → IO с сообщением об ошибке
//         (theme) => applyTheme(dom, theme)       // Right → IO с применением темы
//           .map(t => `Тема применена: ${t}`)
//       );
//     return result; // result — это IO
//   });
//
// Пример:
//   const storage = createStorage({ config: '{"theme":"dark","lang":"ru"}' });
//   const dom = createDOM();
//   const io = loadAndApplyTheme(storage, dom);
//   io.unsafePerformIO()
//   // → 'Тема применена: dark'
//   // dom.getAttribute('body', 'data-theme') === 'dark'
// ---------------------------------------------------------------------------

const loadAndApplyTheme = (storage: Storage, dom: DOMSim): IO<string> => {
  // TODO:
  // new IO(() => storage.getItem('config'))
  //   .chain(configStr => {
  //     return parseConfig(configStr)
  //       .chain(extractTheme)
  //       .chain(validateTheme)
  //       .fold(
  //         (err) => IO.of(`Ошибка: ${err}`),
  //         (theme) => applyTheme(dom, theme).map(t => `Тема применена: ${t}`)
  //       );
  //   });
  return undefined as unknown as IO<string>;
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

function test(description: string, actual: unknown, expected: unknown): void {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
}

function foldEither(either: Either<unknown, unknown> | undefined): string | undefined {
  if (!either) return undefined;
  if (either instanceof Left) {
    const err = either._value;
    return `LEFT:${err instanceof Error ? err.message : err}`;
  }
  if (either instanceof Right) {
    const val = either._value;
    return `RIGHT:${typeof val === 'object' ? JSON.stringify(val) : val}`;
  }
  return undefined;
}

console.log('\n--- Упражнение 5: Реальный пайплайн — IO + Either + Maybe ---\n');

// 5.1 tryCatch
console.log('5.1 tryCatch:');
test('успешный вызов → Right',   foldEither(tryCatch(() => JSON.parse('{"a":1}'))), 'RIGHT:{"a":1}');
test('исключение → Left',        foldEither(tryCatch(() => JSON.parse('bad')))?.startsWith('LEFT:'), true);
test('ошибка с throw → Left',    foldEither(tryCatch(() => { throw new Error('oops'); })), 'LEFT:oops');
test('вычисление без ошибки',    foldEither(tryCatch(() => 2 + 2)), 'RIGHT:4');

// 5.2 parseConfig
console.log('\n5.2 parseConfig:');
test('корректный JSON → Right',
  foldEither(parseConfig('{"theme":"dark"}')),
  'RIGHT:{"theme":"dark"}'
);
test('null → Left конфиг не найден',
  foldEither(parseConfig(null)),
  'LEFT:Конфиг не найден'
);
test('некорректный JSON → Left начинается с "Некорректный JSON"',
  foldEither(parseConfig('bad json'))?.startsWith('LEFT:Некорректный JSON'),
  true
);

// 5.3 extractTheme
console.log('\n5.3 extractTheme:');
test('тема есть → Right',        foldEither(extractTheme({ theme: 'dark', lang: 'ru' })), 'RIGHT:dark');
test('темы нет → Left',          foldEither(extractTheme({ lang: 'ru' })), 'LEFT:Тема не указана в конфиге');
test('пустой объект → Left',     foldEither(extractTheme({})), 'LEFT:Тема не указана в конфиге');

// 5.4 validateTheme
console.log('\n5.4 validateTheme:');
test('dark → Right',             foldEither(validateTheme('dark')),   'RIGHT:dark');
test('light → Right',            foldEither(validateTheme('light')),  'RIGHT:light');
test('system → Right',           foldEither(validateTheme('system')), 'RIGHT:system');
test('неизвестная тема → Left',
  foldEither(validateTheme('purple'))?.startsWith('LEFT:Недопустимая тема'),
  true
);
test('пустая строка → Left',
  foldEither(validateTheme(''))?.startsWith('LEFT:Недопустимая тема'),
  true
);

// 5.5 applyTheme
console.log('\n5.5 applyTheme:');
{
  const dom = createDOM();
  test('applyTheme возвращает IO', typeof applyTheme(dom, 'dark')?.unsafePerformIO, 'function');
  test('DOM не изменён до запуска', dom.getAttribute('body', 'data-theme'), null);
  const result = applyTheme(dom, 'dark')?.unsafePerformIO?.();
  test('unsafePerformIO возвращает тему', result, 'dark');
  test('DOM изменён после запуска', dom.getAttribute('body', 'data-theme'), 'dark');
}

// 5.6 loadAndApplyTheme
console.log('\n5.6 loadAndApplyTheme — полный пайплайн:');
{
  // Сценарий 1: всё хорошо — тема dark
  const s1 = createStorage({ config: '{"theme":"dark","lang":"ru"}' });
  const d1 = createDOM();
  const io1 = loadAndApplyTheme(s1, d1);
  test('loadAndApplyTheme возвращает IO', typeof io1?.unsafePerformIO, 'function');
  test('DOM не изменён до запуска', d1.getAttribute('body', 'data-theme'), null);
  test('пайплайн возвращает "Тема применена: dark"', io1?.unsafePerformIO?.(), 'Тема применена: dark');
  test('DOM содержит тему dark', d1.getAttribute('body', 'data-theme'), 'dark');

  // Сценарий 2: тема light
  const s2 = createStorage({ config: '{"theme":"light"}' });
  const d2 = createDOM();
  test('тема light применена', loadAndApplyTheme(s2, d2)?.unsafePerformIO?.(), 'Тема применена: light');
  test('DOM содержит light',   d2.getAttribute('body', 'data-theme'), 'light');

  // Сценарий 3: конфиг отсутствует
  const s3 = createStorage({});
  const d3 = createDOM();
  test(
    'нет конфига → ошибка',
    loadAndApplyTheme(s3, d3)?.unsafePerformIO?.(),
    'Ошибка: Конфиг не найден'
  );
  test('DOM не изменён при ошибке', d3.getAttribute('body', 'data-theme'), null);

  // Сценарий 4: некорректный JSON
  const s4 = createStorage({ config: 'не json' });
  const d4 = createDOM();
  test(
    'некорректный JSON → ошибка',
    loadAndApplyTheme(s4, d4)?.unsafePerformIO?.()?.startsWith('Ошибка: Некорректный JSON'),
    true
  );

  // Сценарий 5: поле theme отсутствует
  const s5 = createStorage({ config: '{"lang":"ru"}' });
  const d5 = createDOM();
  test(
    'нет поля theme → ошибка',
    loadAndApplyTheme(s5, d5)?.unsafePerformIO?.(),
    'Ошибка: Тема не указана в конфиге'
  );

  // Сценарий 6: недопустимая тема
  const s6 = createStorage({ config: '{"theme":"purple"}' });
  const d6 = createDOM();
  test(
    'недопустимая тема → ошибка',
    loadAndApplyTheme(s6, d6)?.unsafePerformIO?.()?.startsWith('Ошибка: Недопустимая тема'),
    true
  );
}
