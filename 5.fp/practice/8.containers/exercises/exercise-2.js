/**
 * Упражнение 2: Maybe — безопасные операции и цепочки
 * Сложность: средняя
 *
 * Задача:
 *   Научиться использовать Maybe для безопасного доступа к данным,
 *   которые могут отсутствовать. Строить цепочки .map() без единого if.
 *
 * Запуск:
 *   node exercise-2.js
 */

import { Maybe } from './containers.js';

// ---------------------------------------------------------------------------
// Задание 2.1
// Напиши функцию safeHead, которая возвращает Maybe с первым элементом
// массива. Если массив пуст, null или undefined — возвращай Maybe(null).
//
// Пример:
//   safeHead([1, 2, 3]).getOrElse('пусто')  → 1
//   safeHead([]).getOrElse('пусто')          → 'пусто'
//   safeHead(null).getOrElse('пусто')        → 'пусто'
//   safeHead(undefined).getOrElse('пусто')   → 'пусто'
//
// Подсказка: Maybe.of(arr) — что произойдёт, если arr пустой массив?
// Пустой массив НЕ является null, но arr[0] вернёт undefined.
// ---------------------------------------------------------------------------

const safeHead = (arr) => {
  // TODO: оберни в Maybe и достань первый элемент через .map()
};

// ---------------------------------------------------------------------------
// Задание 2.2
// Напиши функцию safeProp — фабрику, которая принимает ключ и
// возвращает функцию, безопасно достающую значение по этому ключу.
//
// Пример:
//   const getName = safeProp('name');
//   getName({ name: 'Иван' }).getOrElse('?')    → 'Иван'
//   getName({ age: 25 }).getOrElse('?')          → '?'
//   getName(null).getOrElse('?')                 → '?'
// ---------------------------------------------------------------------------

const safeProp = (key) => (obj) => {
  // TODO: оберни obj в Maybe и достань свойство key через .map()
};

// ---------------------------------------------------------------------------
// Задание 2.3
// Напиши функцию getFirstUserName, которая принимает массив объектов вида
// [{ name: 'Иван' }, { name: 'Мария' }] и возвращает строку:
//   — имя первого пользователя в верхнем регистре, если массив не пуст
//     и у первого элемента есть свойство name
//   — строку 'Аноним' в остальных случаях
//
// Пример:
//   getFirstUserName([{ name: 'Иван' }])   → 'ИВАН'
//   getFirstUserName([{ age: 30 }])        → 'Аноним'
//   getFirstUserName([])                   → 'Аноним'
//   getFirstUserName(null)                 → 'Аноним'
//
// Условие: используй safeHead и safeProp из заданий 2.1 и 2.2.
// Никаких if — только цепочка .map().
// ---------------------------------------------------------------------------

const getFirstUserName = (users) => {
  // TODO: safeHead → safeProp('name') → toUpperCase → getOrElse
};

// ---------------------------------------------------------------------------
// Задание 2.4
// Напиши функцию getNestedValue, которая безопасно достаёт obj.a.b.c.d.
// Если любой уровень вложенности отсутствует — возвращай строку 'не найдено'.
//
// Пример:
//   getNestedValue({ a: { b: { c: { d: 42 } } } })  → 42
//   getNestedValue({ a: { b: { c: {} } } })           → 'не найдено'
//   getNestedValue({ a: null })                        → 'не найдено'
//   getNestedValue({})                                 → 'не найдено'
//
// Подсказка: четыре вызова .map(safeProp(...)) подряд.
// ---------------------------------------------------------------------------

const getNestedValue = (obj) => {
  // TODO
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(description, actual, expected) {
  if (actual === expected) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expected)}`);
    console.error(`    Получено:  ${JSON.stringify(actual)}`);
    failed++;
  }
}

function testMaybe(description, maybeResult, expected) {
  const actual = maybeResult?.getOrElse('НИЧЕГО');
  test(description, actual, expected);
}

console.log('\n--- Упражнение 2: Maybe ---\n');

// 2.1 safeHead
console.log('2.1 safeHead:');
testMaybe('safeHead([1,2,3]) → 1',       safeHead([1, 2, 3]),  1);
testMaybe('safeHead([]) → пусто',         safeHead([]),         'НИЧЕГО');
testMaybe('safeHead(null) → пусто',       safeHead(null),       'НИЧЕГО');
testMaybe('safeHead(undefined) → пусто',  safeHead(undefined),  'НИЧЕГО');
testMaybe('safeHead(["a"]) → "a"',        safeHead(['a']),      'a');

// 2.2 safeProp
console.log('\n2.2 safeProp:');
const getName = safeProp('name');
testMaybe('safeProp("name")({name: "Иван"}) → "Иван"', getName({ name: 'Иван' }), 'Иван');
testMaybe('safeProp("name")({age: 25}) → пусто',        getName({ age: 25 }),     'НИЧЕГО');
testMaybe('safeProp("name")(null) → пусто',             getName(null),            'НИЧЕГО');

// 2.3 getFirstUserName
console.log('\n2.3 getFirstUserName:');
test('getFirstUserName([{name:"Иван"}]) → "ИВАН"', getFirstUserName([{ name: 'Иван' }]), 'ИВАН');
test('getFirstUserName([{age:30}]) → "Аноним"',    getFirstUserName([{ age: 30 }]),       'Аноним');
test('getFirstUserName([]) → "Аноним"',            getFirstUserName([]),                  'Аноним');
test('getFirstUserName(null) → "Аноним"',          getFirstUserName(null),                'Аноним');
test('getFirstUserName([{name:"анна"}]) → "АННА"', getFirstUserName([{ name: 'анна' }]), 'АННА');

// 2.4 getNestedValue
console.log('\n2.4 getNestedValue:');
test('полный путь a.b.c.d = 42',     getNestedValue({ a: { b: { c: { d: 42 } } } }), 42);
test('d отсутствует → "не найдено"', getNestedValue({ a: { b: { c: {} } } }),          'не найдено');
test('a: null → "не найдено"',       getNestedValue({ a: null }),                       'не найдено');
test('{} → "не найдено"',            getNestedValue({}),                                'не найдено');
test('d = 0 (falsy, но есть)',       getNestedValue({ a: { b: { c: { d: 0 } } } }),    0);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
