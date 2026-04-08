/**
 * Упражнение 4: IO chain — последовательность эффектов
 * Сложность: средняя-сложная
 *
 * Задача:
 *   Научиться строить цепочки IO-операций через chain.
 *   Каждая операция в цепочке получает результат предыдущей и
 *   возвращает новый IO — без вложенности.
 *
 * Ключевая идея:
 *   Если использовать map с функцией, возвращающей IO,
 *   получается IO(IO(x)) — вложенный IO, который нужно запускать дважды.
 *   chain = map + join убирает вложенность:
 *   результат — один плоский IO, запускаемый один раз.
 *
 * Запуск:
 *   npx tsx exercise-4.ts
 */

import { IO } from './containers.ts';

// ---------------------------------------------------------------------------
// Симуляция внешней среды
//
// Вместо реального localStorage / DOM используем объекты.
// Это позволяет запускать упражнение в Node.js без браузера.
// ---------------------------------------------------------------------------

export interface Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  inspect: () => Record<string, string>;
}

export interface DOM {
  getValue: (id: string) => string | null;
  setValue: (id: string, value: string) => void;
  inspect: () => Record<string, string>;
}

// Симулированное хранилище (аналог localStorage)
export const createStorage = (initial: Record<string, string> = {}): Storage => {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    inspect: () => ({ ...store }),
  };
};

// Симулированный DOM (аналог document.getElementById)
export const createDOM = (initial: Record<string, string> = {}): DOM => {
  const elements: Record<string, { value: string }> = {};
  for (const [id, value] of Object.entries(initial)) {
    elements[id] = { value: String(value) };
  }
  return {
    getValue: (id) => elements[id]?.value ?? null,
    setValue: (id, value) => {
      if (!elements[id]) elements[id] = { value: '' };
      elements[id].value = String(value);
    },
    inspect: () =>
      Object.fromEntries(
        Object.entries(elements).map(([k, v]) => [k, v.value])
      ),
  };
};

// ---------------------------------------------------------------------------
// Задание 4.1 — IO-чтение и IO-запись
//
// Напиши две функции:
//
// readStorage(storage, key) — возвращает IO, который при запуске
//   читает значение из storage по ключу key.
//   При запуске unsafePerformIO() вызывает storage.getItem(key).
//
// writeDOM(dom, id, value) — возвращает IO, который при запуске
//   записывает value в DOM-элемент с идентификатором id.
//   При запуске unsafePerformIO() вызывает dom.setValue(id, value)
//   и возвращает value (чтобы его можно было передать дальше в chain).
//
// Важно: IO — это отложенный эффект. Функции не выполняют чтение/запись
// сразу, а только "описывают рецепт".
//
// Пример:
//   const storage = createStorage({ name: 'Иван' });
//   const io = readStorage(storage, 'name');
//   // ничего не выполнено!
//   io.unsafePerformIO(); // → 'Иван' (вот теперь выполнено)
// ---------------------------------------------------------------------------

export const readStorage = (storage: Storage, key: string): IO<string | null> => {
  // TODO: new IO(() => storage.getItem(key))
  return undefined as unknown as IO<string | null>;
};

export const writeDOM = (dom: DOM, id: string, value: string): IO<string> => {
  // TODO: new IO(() => { dom.setValue(id, value); return value; })
  return undefined as unknown as IO<string>;
};

// ---------------------------------------------------------------------------
// Задание 4.2 — трансформация значения внутри IO
//
// Напиши функцию toUpperCaseIO(io), которая принимает IO со строкой
// и возвращает новый IO с той же строкой в верхнем регистре.
//
// Используй .map() — строка не нужна нам немедленно,
// мы просто описываем трансформацию.
//
// Пример:
//   const storage = createStorage({ greeting: 'привет' });
//   toUpperCaseIO(readStorage(storage, 'greeting')).unsafePerformIO()
//   → 'ПРИВЕТ'
// ---------------------------------------------------------------------------

export const toUpperCaseIO = (io: IO<string | null>): IO<string> => {
  // TODO: io.map(str => str.toUpperCase())
  return undefined as unknown as IO<string>;
};

// ---------------------------------------------------------------------------
// Задание 4.3 — пайплайн: читаем → трансформируем → пишем
//
// Напиши функцию copyAndTransform(storage, dom, fromKey, toId, transform),
// которая строит IO-пайплайн:
//   1. Читает значение из storage по ключу fromKey
//   2. Применяет функцию transform к значению
//   3. Записывает результат в DOM-элемент toId
//
// Возвращает IO (не запускает его!). Вся цепочка выполняется только
// при вызове .unsafePerformIO().
//
// Используй chain для шагов 2→3 (потому что writeDOM возвращает IO).
// Используй map для шага 1→2 (transform возвращает обычное значение).
//
// Пример:
//   const storage = createStorage({ count: '5' });
//   const dom = createDOM();
//   const io = copyAndTransform(
//     storage, dom, 'count', 'result', n => String(Number(n) * 2)
//   );
//   // DOM ещё не изменён!
//   io.unsafePerformIO();
//   // Теперь dom.getValue('result') === '10'
// ---------------------------------------------------------------------------

export const copyAndTransform = (
  storage: Storage,
  dom: DOM,
  fromKey: string,
  toId: string,
  transform: (value: string | null) => string,
): IO<string> => {
  // TODO:
  // readStorage(storage, fromKey)     — IO('5')
  //   .map(transform)                 — IO('10')  (transform возвращает строку)
  //   .chain(value =>                 — chain, потому что writeDOM возвращает IO
  //     writeDOM(dom, toId, value)
  //   )
  return undefined as unknown as IO<string>;
};

// ---------------------------------------------------------------------------
// Задание 4.4 — цепочка из трёх IO
//
// Напиши функцию buildGreeting(storage, dom), которая:
//   1. Читает имя из storage по ключу 'firstName'         (IO)
//   2. Читает фамилию из storage по ключу 'lastName'      (IO)
//   3. Формирует строку "Добро пожаловать, Имя Фамилия!"
//   4. Пишет результат в DOM-элемент 'greeting'           (IO)
//
// Сложность: шаги 1 и 2 — два независимых чтения.
// Для решения используй такой подход:
//   — прочитай firstName через readStorage
//   — внутри chain: прочитай lastName через readStorage,
//     внутри вложенного chain — сформируй строку и запиши
//
// Пример:
//   const storage = createStorage({ firstName: 'Иван', lastName: 'Петров' });
//   const dom = createDOM();
//   buildGreeting(storage, dom).unsafePerformIO();
//   dom.getValue('greeting') === 'Добро пожаловать, Иван Петров!'
//
// Подсказка: chain позволяет "захватить" значение из предыдущего шага
// через замыкание:
//   readStorage(storage, 'firstName').chain(firstName =>
//     readStorage(storage, 'lastName').chain(lastName =>
//       writeDOM(dom, 'greeting', `Добро пожаловать, ${firstName} ${lastName}!`)
//     )
//   )
// ---------------------------------------------------------------------------

export const buildGreeting = (storage: Storage, dom: DOM): IO<string> => {
  // TODO
  return undefined as unknown as IO<string>;
};
