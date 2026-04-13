/**
 * Упражнение 1: Разминка — join и снятие вложенности
 * Сложность: начинающий
 *
 * Задача:
 *   Понять, что делает join на конкретных примерах. Сначала напишешь
 *   собственный класс Box с join, потом проверишь, что join работает
 *   и на готовом Maybe из containers.js.
 *
 * Запуск:
 *   node exercise-1.js
 */

import { Maybe } from './containers.js';

// ---------------------------------------------------------------------------
// Задание 1.1 — собственный класс Box
//
// Напиши класс Box с методами:
//   static of(value)  — оборачивает значение
//   map(fn)           — трансформирует значение внутри, возвращает новый Box
//   join()            — снимает один слой: Box(Box(x)).join() → Box(x)
//
// Запомни ключевое правило: join НЕ знает, что внутри.
// Он просто возвращает то, что лежит внутри _value.
// Если внутри Box — отдаёт этот Box. Если число — отдаёт число.
//
// Пример:
//   Box.of(42).join()              → 42
//   Box.of(Box.of(42)).join()      → Box(42)
//   Box.of(Box.of(Box.of(7)))
//     .join()                      → Box(Box(7))
//     .join()                      → Box(7)
//     .join()                      → 7
// ---------------------------------------------------------------------------

class Box {
  constructor(value) {
    this._value = value;
  }

  static of(value) {
    // TODO: оберни value в новый Box
  }

  map(fn) {
    // TODO: верни новый Box с применённым fn
  }

  join() {
    // TODO: верни this._value (просто снять обёртку)
  }

  inspect() {
    return `Box(${this._value?.inspect?.() ?? this._value})`;
  }
}

// ---------------------------------------------------------------------------
// Задание 1.2 — тройное вложение Box
//
// Напиши функцию flattenBox(tripleNested), которая принимает
// Box(Box(Box(value))) и возвращает Box(value).
//
// Используй два вызова join() подряд.
//
// Пример:
//   flattenBox(Box.of(Box.of(Box.of('привет')))) → Box('привет')
// ---------------------------------------------------------------------------

const flattenBox = (tripleNested) => {
  // TODO: два .join()
};

// ---------------------------------------------------------------------------
// Задание 1.3 — map + join вместо chain
//
// Есть функция safeDivide: если делитель равен 0 — возвращает Box(null),
// иначе — Box(результат).
//
// Напиши функцию divideAndDouble(a, b), которая:
//   1. Делит a на b через safeDivide (получаем Box(Maybe или число))
//   2. Применяет удвоение через map
//   3. Убирает лишний слой через join
//
// Другими словами: map(fn) + join() = то, что в следующем упражнении
// будет называться chain.
//
// Пример:
//   divideAndDouble(10, 2)  → Box(10)   // (10/2) * 2 = 10
//   divideAndDouble(9, 3)   → Box(6)    // (9/3)  * 2 = 6
//   divideAndDouble(5, 0)   → Box(null) // деление на 0 → Box(null)
// ---------------------------------------------------------------------------

const safeDivide = (a, b) =>
  b === 0 ? Box.of(null) : Box.of(a / b);

const divideAndDouble = (a, b) => {
  // TODO: safeDivide(a, b).map(...).join()
  // Подсказка: fn внутри map должна вернуть Box с удвоенным значением
  // Если внутри null — верни Box(null) (не умножай null)
};

// ---------------------------------------------------------------------------
// Задание 1.4 — проверка Maybe.join из containers.js
//
// Используй уже готовый Maybe из containers.js.
// Напиши функцию unwrapNested(value), которая:
//   — принимает любое значение
//   — оборачивает его в Maybe дважды: Maybe.of(Maybe.of(value))
//   — применяет join
//   — возвращает результат
//
// Это демонстрирует: join работает так же на Maybe, как на Box.
//
// Пример:
//   unwrapNested(99)   → Maybe(99)      // Maybe(Maybe(99)).join() = Maybe(99)
//   unwrapNested(null) → Maybe(null)    // Maybe(Maybe(null)).join() = Maybe(null)
// ---------------------------------------------------------------------------

const unwrapNested = (value) => {
  // TODO: Maybe.of(Maybe.of(value)).join()
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(description, actual, expected) {
  const ok =
    actual === expected ||
    (actual instanceof Box && expected instanceof Box && actual._value === expected._value) ||
    (actual instanceof Maybe && expected instanceof Maybe &&
      actual._value === expected._value);

  if (ok) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expected?._value ?? expected)}`);
    console.error(`    Получено:  ${JSON.stringify(actual?._value ?? actual)}`);
    failed++;
  }
}

console.log('\n--- Упражнение 1: join и снятие вложенности ---\n');

// 1.1 Box.join
console.log('1.1 Box — join:');
test(
  'Box.of(42).join() возвращает 42',
  Box.of(42).join(),
  42
);
test(
  'Box.of(Box.of(42)).join() возвращает Box(42)',
  Box.of(Box.of(42)).join(),
  Box.of(42)
);
test(
  'Box.of("строка").join() возвращает строку',
  Box.of('строка').join(),
  'строка'
);
test(
  'Box.map работает корректно',
  Box.of(5).map(x => x * 2)._value,
  10
);

// 1.2 flattenBox
console.log('\n1.2 flattenBox — тройное вложение:');
const triple7   = Box.of(Box.of(Box.of(7)));
const tripleStr = Box.of(Box.of(Box.of('hello')));
test('flattenBox(Box(Box(Box(7)))) → Box(7)',       flattenBox(triple7),   Box.of(7));
test('flattenBox(Box(Box(Box("hello")))) → Box("hello")', flattenBox(tripleStr), Box.of('hello'));

// 1.3 divideAndDouble
console.log('\n1.3 divideAndDouble — map + join:');
test('divideAndDouble(10, 2) → Box(10)',   divideAndDouble(10, 2), Box.of(10));
test('divideAndDouble(9, 3)  → Box(6)',    divideAndDouble(9, 3),  Box.of(6));
test('divideAndDouble(5, 0)  → Box(null)', divideAndDouble(5, 0),  Box.of(null));
test('divideAndDouble(0, 4)  → Box(0)',    divideAndDouble(0, 4),  Box.of(0));

// 1.4 Maybe.join
console.log('\n1.4 unwrapNested — Maybe.join:');
test(
  'unwrapNested(99) → Maybe(99)',
  unwrapNested(99),
  Maybe.of(99)
);
test(
  'unwrapNested("привет") → Maybe("привет")',
  unwrapNested('привет'),
  Maybe.of('привет')
);
{
  // Maybe(null) — особый случай: isNothing, join возвращает себя
  const result = unwrapNested(null);
  const isNothing = result instanceof Maybe && result.isNothing;
  if (isNothing) {
    console.log('  ПРОЙДЕН: unwrapNested(null) → Maybe(null) (isNothing)');
    passed++;
  } else {
    console.error('  ПРОВАЛЕН: unwrapNested(null) должен вернуть Maybe(null)');
    failed++;
  }
}

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
