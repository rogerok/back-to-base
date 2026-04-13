/**
 * Упражнение 2: Maybe ap — безопасное комбинирование опциональных значений
 * Сложность: средняя
 *
 * Задача:
 *   Научиться применять ap к Maybe — контейнеру, который умеет
 *   "короткое замыкание" при null/undefined.
 *
 *   Ключевое правило:
 *     Если ЛЮБОЕ из Maybe-значений в цепочке ap — Nothing (null),
 *     весь результат автоматически становится Maybe(null).
 *
 *   Это позволяет безопасно комбинировать несколько опциональных значений
 *   без единой проверки на null вручную.
 *
 * Запуск:
 *   node exercise-2.js
 */

import { Maybe, curry } from './containers.js';

// ---------------------------------------------------------------------------
// Задание 2.1 — сложение двух Maybe-чисел
//
// Напиши функцию safeAdd(maybeA, maybeB), которая принимает два Maybe<number>
// и возвращает Maybe<number> с их суммой.
//
// Используй ap — НЕ проверяй isNothing вручную!
//
// Подсказка: Maybe.of(curriedAdd).ap(maybeA).ap(maybeB)
//
// Пример:
//   safeAdd(Maybe.of(2), Maybe.of(3))    → Maybe(5)
//   safeAdd(Maybe.of(null), Maybe.of(3)) → Maybe(null)
//   safeAdd(Maybe.of(2), Maybe.of(null)) → Maybe(null)
// ---------------------------------------------------------------------------

const add = curry((a, b) => a + b);

const safeAdd = (maybeA, maybeB) => {
  // TODO: Maybe.of(add).ap(maybeA).ap(maybeB)
};

// ---------------------------------------------------------------------------
// Задание 2.2 — объединение опционального имени и фамилии
//
// Напиши функцию safeFullName(user), где user — объект вида:
//   { firstName: string | null, lastName: string | null }
//
// Верни Maybe<string> с полным именем вида "Имя Фамилия".
//
// Оба поля опциональны: если любое из них null — вернуть Maybe(null).
//
// Подсказки:
//   - Сначала достань Maybe из каждого поля: Maybe.of(user.firstName)
//   - Используй ap для объединения
//   - Каррированная функция объединения: curry((first, last) => `${first} ${last}`)
//
// Пример:
//   safeFullName({ firstName: 'Иван', lastName: 'Петров' }) → Maybe("Иван Петров")
//   safeFullName({ firstName: null,   lastName: 'Петров' }) → Maybe(null)
//   safeFullName({ firstName: 'Иван', lastName: null })     → Maybe(null)
// ---------------------------------------------------------------------------

const combineName = curry((first, last) => `${first} ${last}`);

const safeFullName = (user) => {
  // TODO:
  // const maybeFirst = Maybe.of(user.firstName);
  // const maybeLast  = Maybe.of(user.lastName);
  // Maybe.of(combineName).ap(maybeFirst).ap(maybeLast)
};

// ---------------------------------------------------------------------------
// Задание 2.3 — сборка даты из трёх опциональных частей
//
// Напиши функцию safeCreateDate(maybeYear, maybeMonth, maybeDay),
// которая принимает три Maybe<number> и возвращает Maybe<string>
// с датой в формате "YYYY-MM-DD".
//
// Если хотя бы одно значение null — вернуть Maybe(null).
//
// Подсказка: pad = n => String(n).padStart(2, '0')
//
// Пример:
//   safeCreateDate(Maybe.of(2024), Maybe.of(3), Maybe.of(5))   → Maybe("2024-03-05")
//   safeCreateDate(Maybe.of(2024), Maybe.of(null), Maybe.of(5)) → Maybe(null)
//   safeCreateDate(Maybe.of(null), Maybe.of(null), Maybe.of(null)) → Maybe(null)
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const buildDate = curry((year, month, day) => `${year}-${pad(month)}-${pad(day)}`);

const safeCreateDate = (maybeYear, maybeMonth, maybeDay) => {
  // TODO: Maybe.of(buildDate).ap(maybeYear).ap(maybeMonth).ap(maybeDay)
};

// ---------------------------------------------------------------------------
// Задание 2.4 — демонстрация короткого замыкания
//
// Напиши функцию safeMultiply3(a, b, c), которая умножает три Maybe-числа.
// Затем убедись: если ЛЮБОЕ из трёх — null, результат всегда Maybe(null).
//
// Пример:
//   safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(4)) → Maybe(24)
//   safeMultiply3(Maybe.of(null), Maybe.of(3), Maybe.of(4)) → Maybe(null)
//   safeMultiply3(Maybe.of(2), Maybe.of(null), Maybe.of(4)) → Maybe(null)
//   safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(null)) → Maybe(null)
// ---------------------------------------------------------------------------

const multiply3 = curry((a, b, c) => a * b * c);

const safeMultiply3 = (maybeA, maybeB, maybeC) => {
  // TODO: Maybe.of(multiply3).ap(maybeA).ap(maybeB).ap(maybeC)
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(description, actual, expectedValue, expectNothing = false) {
  const isNothing = actual instanceof Maybe && actual.isNothing;

  if (expectNothing) {
    if (isNothing) {
      console.log(`  ПРОЙДЕН: ${description}`);
      passed++;
    } else {
      console.error(`  ПРОВАЛЕН: ${description}`);
      console.error(`    Ожидалось: Maybe(null)`);
      console.error(`    Получено:  ${actual?.inspect?.()}`);
      failed++;
    }
    return;
  }

  const actualVal = actual instanceof Maybe ? actual._value : actual;
  if (actualVal === expectedValue) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expectedValue)}`);
    console.error(`    Получено:  ${JSON.stringify(actualVal)}`);
    failed++;
  }
}

console.log('\n--- Упражнение 2: Maybe ap — опциональные значения ---\n');

// 2.1 safeAdd
console.log('2.1 safeAdd — сложение двух Maybe:');
test('safeAdd(Maybe(2), Maybe(3)) → Maybe(5)', safeAdd(Maybe.of(2), Maybe.of(3)), 5);
test('safeAdd(Maybe(10), Maybe(-4)) → Maybe(6)', safeAdd(Maybe.of(10), Maybe.of(-4)), 6);
test('safeAdd(Maybe(null), Maybe(3)) → Maybe(null)', safeAdd(Maybe.of(null), Maybe.of(3)), null, true);
test('safeAdd(Maybe(2), Maybe(null)) → Maybe(null)', safeAdd(Maybe.of(2), Maybe.of(null)), null, true);
test('safeAdd(Maybe(null), Maybe(null)) → Maybe(null)', safeAdd(Maybe.of(null), Maybe.of(null)), null, true);

// 2.2 safeFullName
console.log('\n2.2 safeFullName — полное имя:');
test(
  'safeFullName({ firstName: "Иван", lastName: "Петров" }) → Maybe("Иван Петров")',
  safeFullName({ firstName: 'Иван', lastName: 'Петров' }),
  'Иван Петров'
);
test(
  'safeFullName({ firstName: null, lastName: "Петров" }) → Maybe(null)',
  safeFullName({ firstName: null, lastName: 'Петров' }),
  null,
  true
);
test(
  'safeFullName({ firstName: "Иван", lastName: null }) → Maybe(null)',
  safeFullName({ firstName: 'Иван', lastName: null }),
  null,
  true
);
test(
  'safeFullName({ firstName: null, lastName: null }) → Maybe(null)',
  safeFullName({ firstName: null, lastName: null }),
  null,
  true
);

// 2.3 safeCreateDate
console.log('\n2.3 safeCreateDate — сборка даты:');
test(
  'safeCreateDate(Maybe(2024), Maybe(3), Maybe(5)) → Maybe("2024-03-05")',
  safeCreateDate(Maybe.of(2024), Maybe.of(3), Maybe.of(5)),
  '2024-03-05'
);
test(
  'safeCreateDate(Maybe(2000), Maybe(12), Maybe(31)) → Maybe("2000-12-31")',
  safeCreateDate(Maybe.of(2000), Maybe.of(12), Maybe.of(31)),
  '2000-12-31'
);
test(
  'safeCreateDate(Maybe(2024), Maybe(null), Maybe(5)) → Maybe(null)',
  safeCreateDate(Maybe.of(2024), Maybe.of(null), Maybe.of(5)),
  null,
  true
);
test(
  'safeCreateDate(Maybe(null), Maybe(3), Maybe(5)) → Maybe(null)',
  safeCreateDate(Maybe.of(null), Maybe.of(3), Maybe.of(5)),
  null,
  true
);

// 2.4 safeMultiply3 — короткое замыкание
console.log('\n2.4 safeMultiply3 — короткое замыкание при любом null:');
test(
  'safeMultiply3(Maybe(2), Maybe(3), Maybe(4)) → Maybe(24)',
  safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(4)),
  24
);
test(
  'safeMultiply3(Maybe(null), Maybe(3), Maybe(4)) → Maybe(null)',
  safeMultiply3(Maybe.of(null), Maybe.of(3), Maybe.of(4)),
  null,
  true
);
test(
  'safeMultiply3(Maybe(2), Maybe(null), Maybe(4)) → Maybe(null)',
  safeMultiply3(Maybe.of(2), Maybe.of(null), Maybe.of(4)),
  null,
  true
);
test(
  'safeMultiply3(Maybe(2), Maybe(3), Maybe(null)) → Maybe(null)',
  safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(null)),
  null,
  true
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
