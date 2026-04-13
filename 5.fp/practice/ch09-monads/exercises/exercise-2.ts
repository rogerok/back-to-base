import { expect, it } from 'vitest';

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

import { Maybe } from './containers.ts';

// ---------------------------------------------------------------------------
// Вспомогательные функции — уже реализованы, используй их в заданиях
// ---------------------------------------------------------------------------

// safeProp: безопасный доступ к свойству объекта
// Возвращает Maybe — значит для навигации нужен chain.
// Принимает unknown — чтобы работать в chain после любого предыдущего шага.
const safeProp =
  (key: string) =>
  (obj: unknown): Maybe<unknown> =>
    Maybe.of(obj == null ? null : (obj as Record<string, unknown>)[key]);

// safeHead: безопасный доступ к первому элементу массива
// Возвращает Maybe — тоже требует chain
const safeHead = (arr: unknown): Maybe<unknown> =>
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

const getCity = (user: unknown): string => {
  // TODO: Maybe.of(user).chain(...).chain(...).getOrElse(...)
  //
  // Подсказка: safeProp('address') возвращает функцию,
  // которую можно передать прямо в chain:
  //   Maybe.of(user).chain(safeProp('address'))
  return undefined as unknown as string;
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

const getFirstFriendEmail = (user: unknown): string => {
  // TODO: Maybe.of(user)
  //         .chain(safeProp('friends'))   — достаём массив friends
  //         .chain(safeHead)              — берём первого
  //         .chain(safeProp('email'))     — берём email
  //         .getOrElse('Email не найден')
  return undefined as unknown as string;
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

const getConfigValue = (config: unknown, ...keys: string[]): unknown => {
  // TODO:
  // Начни с Maybe.of(config), затем для каждого ключа из keys
  // вызывай .chain(safeProp(key)).
  // В конце — .getOrElse(null).
  //
  // Подсказка: keys.reduce(
  //   (maybeObj, key) => maybeObj.chain(safeProp(key)),
  //   Maybe.of(config)
  // ).getOrElse(null)
  return undefined as unknown;
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

const getAgeWrong = (user: unknown): Maybe<unknown> => {
  // TODO: Maybe.of(user).map(safeProp('age'))
  // — это возвращает Maybe(Maybe(age)), что неудобно
  return undefined as unknown as Maybe<unknown>;
};

const getAge = (user: unknown): number => {
  // TODO: правильная версия через chain
  return undefined as unknown as number;
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

function test(description: string, actual: unknown, expected: unknown): void {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
}

console.log('\n--- Упражнение 2: chain для безопасной навигации ---\n');

// 2.1 getCity
console.log('2.1 getCity:');
test('адрес и город есть',            getCity({ address: { city: 'Москва' } }),          'Москва');
test('есть address, нет city',        getCity({ address: {} }),                            'Город не указан');
test('нет address',                   getCity({ name: 'Иван' }),                           'Город не указан');
test('null на входе',                 getCity(null),                                       'Город не указан');
test('address равен null',            getCity({ address: null }),                          'Город не указан');
test('city равен undefined',          getCity({ address: { city: undefined } }),           'Город не указан');

// 2.2 getFirstFriendEmail
console.log('\n2.2 getFirstFriendEmail:');
test(
  'первый друг с email',
  getFirstFriendEmail({ friends: [{ email: 'alice@mail.com' }] }),
  'alice@mail.com'
);
test(
  'первый друг без email',
  getFirstFriendEmail({ friends: [{ name: 'Боб' }] }),
  'Email не найден'
);
test(
  'массив друзей пуст',
  getFirstFriendEmail({ friends: [] }),
  'Email не найден'
);
test(
  'нет поля friends',
  getFirstFriendEmail({}),
  'Email не найден'
);
test(
  'несколько друзей — берём первого',
  getFirstFriendEmail({
    friends: [{ email: 'first@mail.com' }, { email: 'second@mail.com' }],
  }),
  'first@mail.com'
);

// 2.3 getConfigValue
console.log('\n2.3 getConfigValue:');
const cfg = { db: { host: { name: 'localhost' }, port: 5432 }, debug: true };
test('путь из трёх ключей',           getConfigValue(cfg, 'db', 'host', 'name'), 'localhost');
test('путь из двух ключей',           getConfigValue(cfg, 'db', 'port'),         5432);
test('булево значение',               getConfigValue(cfg, 'debug'),              true);
test('несуществующий ключ',           getConfigValue(cfg, 'api'),                null);
test('несуществующий вложенный ключ', getConfigValue(cfg, 'db', 'password'),     null);
test('null на входе',                 getConfigValue(null, 'db'),                null);
test('пустой путь ключей',            getConfigValue(cfg),                       cfg);

// 2.4 map vs chain
console.log('\n2.4 map vs chain:');
{
  it('getAgeWrong возвращает Maybe(Maybe(25)) — вложенность!', () => {
    const wrongResult = getAgeWrong({ age: 25 });
    const isNestedMaybe =
      wrongResult instanceof Maybe &&
      wrongResult._value instanceof Maybe &&
      (wrongResult._value as Maybe<unknown>)._value === 25;
    expect(isNestedMaybe).toBe(true);
  });
}
test('getAge({ age: 25 }) → 25',  getAge({ age: 25 }), 25);
test('getAge({ age: 0 })  → 0',   getAge({ age: 0 }),  0);
test('getAge({})          → 0',   getAge({}),          0);
test('getAge(null)        → 0',   getAge(null),        0);
