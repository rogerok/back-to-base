/**
 * Упражнение 2: chain для безопасной навигации с Maybe
 * Сложность: средняя
 *
 * Задача:
 *   Использовать chain для безопасного доступа к вложенным свойствам объекта.
 *   safeProp возвращает Maybe — значит нужен chain, а не map.
 *   Без chain каждый шаг создаёт лишний слой: Maybe(Maybe(Maybe(...))).
 *
 * Ключевое правило:
 *   — map(fn)   когда fn возвращает обычное значение
 *   — chain(fn) когда fn возвращает Maybe (или другой контейнер)
 *
 * Запуск:
 *   npx tsx exercise-2.ts
 */

import { Maybe } from "./containers.ts";

// ---------------------------------------------------------------------------
// Вспомогательные функции — уже реализованы, используй их в заданиях
// ---------------------------------------------------------------------------

// safeProp: безопасный доступ к свойству объекта
// Возвращает Maybe — значит для навигации нужен chain.
// Принимает unknown — чтобы работать в chain после любого предыдущего шага.
export const safeProp =
  (key: string) =>
  (obj: unknown): Maybe<unknown> =>
    Maybe.of(obj == null ? null : (obj as Record<string, unknown>)[key]);

// safeHead: безопасный доступ к первому элементу массива
// Возвращает Maybe — тоже требует chain
export const safeHead = (arr: unknown): Maybe<unknown> =>
  Array.isArray(arr) && arr.length > 0 ? Maybe.of(arr[0]) : Maybe.of(null);

// ---------------------------------------------------------------------------
// Задание 2.1 — getCity
//
// Напиши функцию getCity(user), которая извлекает user.address.city.
// Если любое из свойств отсутствует или равно null/undefined — возвращай
// строку 'Город не указан'.
//
// Используй safeProp и chain.
//
// Пример:
//   getCity({ address: { city: 'Москва' } })  → 'Москва'
//   getCity({ address: {} })                   → 'Город не указан'
//   getCity({ name: 'Иван' })                  → 'Город не указан'
//   getCity(null)                               → 'Город не указан'
// ---------------------------------------------------------------------------

export const getCity = (user: unknown): string => {
  return Maybe.of(user)
    .chain(safeProp("address"))
    .chain(safeProp("city"))
    .getOrElse("Город не указан") as string;
};

// ---------------------------------------------------------------------------
// Задание 2.2 — getFirstFriendEmail
//
// Напиши функцию getFirstFriendEmail(user), которая извлекает email
// первого друга: user.friends[0].email.
//
// Используй safeProp, safeHead и chain.
// Если любое промежуточное значение отсутствует — возвращай 'Email не найден'.
//
// Пример:
//   getFirstFriendEmail({ friends: [{ email: 'alice@mail.com' }] })
//     → 'alice@mail.com'
//
//   getFirstFriendEmail({ friends: [] })
//     → 'Email не найден'
//
//   getFirstFriendEmail({ friends: [{ name: 'Боб' }] })
//     → 'Email не найден'
//
//   getFirstFriendEmail({})
//     → 'Email не найден'
// ---------------------------------------------------------------------------

export const getFirstFriendEmail = (user: unknown): string => {
  return Maybe.of(user)
    .chain(safeProp("friends"))
    .chain(safeHead)
    .chain(safeProp("email"))
    .getOrElse("Email не найден") as string;
};

// ---------------------------------------------------------------------------
// Задание 2.3 — getConfigValue
//
// Напиши функцию getConfigValue(config, ...keys), которая позволяет
// спускаться по произвольно глубокому пути в объекте.
//
// Используй Array.prototype.reduce и chain.
//
// Пример:
//   const cfg = { db: { host: { name: 'localhost' } } };
//   getConfigValue(cfg, 'db', 'host', 'name')  → 'localhost'
//   getConfigValue(cfg, 'db', 'port')           → null
//   getConfigValue(cfg, 'api')                  → null
//   getConfigValue(null, 'db')                  → null
//
// Обрати внимание: возвращаем null (не строку), когда путь не найден.
// Используй .getOrElse(null).
// ---------------------------------------------------------------------------

export const getConfigValue = (config: unknown, ...keys: string[]): unknown => {
  return keys
    .reduce((maybeObj, key) => maybeObj.chain(safeProp(key)), Maybe.of(config))
    .getOrElse(null);
};

// ---------------------------------------------------------------------------
// Задание 2.4 — сравнение map и chain
//
// Напиши функцию getAgeWrong(user) — намеренно НЕПРАВИЛЬНУЮ версию,
// которая использует map вместо chain для safeProp.
// Она вернёт Maybe(Maybe(age)) вместо Maybe(age).
//
// Затем напиши getAge(user) — правильную версию через chain.
// Обе работают с user.age. Используй getOrElse(0) в правильной версии.
//
// Пример:
//   getAgeWrong({ age: 25 })  → Maybe(Maybe(25))  // вложенность!
//   getAge({ age: 25 })       → 25
//   getAge({})                → 0
// ---------------------------------------------------------------------------

export const getAgeWrong = (user: unknown): Maybe<unknown> => {
  return Maybe.of(user).map(safeProp("age"));
};

interface User {
  age: number | null;
}

export const getAge = (user: User | null): number => {
  return Maybe.of(user).chain(safeProp("age")).getOrElse(0) as number;
};
