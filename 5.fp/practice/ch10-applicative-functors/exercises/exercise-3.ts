/**
 * Упражнение 3: liftA2 / liftA3 — поднимаем функции в мир контейнеров
 * Сложность: средняя
 *
 * Задача:
 *   Освоить liftA2 и liftA3 — удобные обёртки над цепочкой ap.
 *
 *   liftA2(fn, F(a), F(b))      === F(a).map(fn).ap(F(b))
 *   liftA3(fn, F(a), F(b), F(c)) === F(a).map(fn).ap(F(b)).ap(F(c))
 *
 *   Преимущество: не нужно вручную оборачивать функцию в контейнер
 *   через .of() — liftA2 делает это за тебя.
 *
 * Запуск:
 *   npx tsx exercise-3.ts
 */

import { Maybe, curry, liftA2, liftA3 } from './containers.ts';

// ---------------------------------------------------------------------------
// Задание 3.1 — safeAdd через liftA2
//
// В упражнении 2 ты написал safeAdd через цепочку .ap().
// Перепиши его с помощью liftA2.
//
// Подсказка: liftA2(add, maybeA, maybeB)
//
// Пример:
//   safeAdd(Maybe.of(2), Maybe.of(3))    → Maybe(5)
//   safeAdd(Maybe.of(null), Maybe.of(3)) → Maybe(null)
// ---------------------------------------------------------------------------

const add = curry((a: number, b: number): number => a + b);

const safeAdd = (maybeA: Maybe<number>, maybeB: Maybe<number>): Maybe<number> => {
  // TODO: liftA2(add, maybeA, maybeB)
  return Maybe.of(null); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 3.2 — диапазон чисел через liftA2
//
// Напиши функцию safeRange(maybeMin, maybeMax), которая принимает
// два Maybe<number> и возвращает Maybe<number[]> — массив [min, min+1, ..., max].
//
// Если min > max — вернуть Maybe([]) (пустой массив).
// Если любое значение null — вернуть Maybe(null).
//
// Подсказка:
//   const makeRange = curry((min, max) => { ... });
//   liftA2(makeRange, maybeMin, maybeMax)
//
// Пример:
//   safeRange(Maybe.of(1), Maybe.of(4))     → Maybe([1, 2, 3, 4])
//   safeRange(Maybe.of(3), Maybe.of(3))     → Maybe([3])
//   safeRange(Maybe.of(5), Maybe.of(3))     → Maybe([])
//   safeRange(Maybe.of(null), Maybe.of(4))  → Maybe(null)
// ---------------------------------------------------------------------------

const makeRange = curry((min: number, max: number): number[] => {
  // TODO: вернуть массив от min до max включительно, или [] если min > max
  // Подсказка: Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return []; // TODO-заглушка
});

const safeRange = (maybeMin: Maybe<number>, maybeMax: Maybe<number>): Maybe<number[]> => {
  // TODO: liftA2(makeRange, maybeMin, maybeMax)
  return Maybe.of(null); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 3.3 — проверка вхождения в диапазон через liftA3
//
// Напиши функцию safeBetween(maybeMin, maybeMax, maybeVal), которая принимает
// три Maybe<number> и возвращает Maybe<boolean> — входит ли val в [min, max].
//
// Если любое из трёх null — Maybe(null).
//
// Подсказка:
//   const between = curry((min, max, val) => val >= min && val <= max);
//   liftA3(between, maybeMin, maybeMax, maybeVal)
//
// Пример:
//   safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(5))   → Maybe(true)
//   safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(15))  → Maybe(false)
//   safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(null)) → Maybe(null)
// ---------------------------------------------------------------------------

const between = curry((min: number, max: number, val: number): boolean => {
  // TODO: val >= min && val <= max
  return false; // TODO-заглушка
});

const safeBetween = (
  maybeMin: Maybe<number>,
  maybeMax: Maybe<number>,
  maybeVal: Maybe<number>
): Maybe<boolean> => {
  // TODO: liftA3(between, maybeMin, maybeMax, maybeVal)
  return Maybe.of(null); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 3.4 — напиши liftA4 самостоятельно
//
// По аналогии с liftA2 и liftA3, реализуй liftA4(fn, f1, f2, f3, f4).
//
// Затем используй его в функции safeFormatAddress(maybeStreet, maybeCity,
// maybeRegion, maybeCountry), которая объединяет четыре опциональных поля
// адреса в строку вида "ул. Ленина, Москва, Московская обл., Россия".
//
// Пример:
//   safeFormatAddress(
//     Maybe.of('ул. Ленина'),
//     Maybe.of('Москва'),
//     Maybe.of('Московская обл.'),
//     Maybe.of('Россия')
//   ) → Maybe("ул. Ленина, Москва, Московская обл., Россия")
//
//   safeFormatAddress(
//     Maybe.of('ул. Ленина'),
//     Maybe.of(null),
//     Maybe.of('Московская обл.'),
//     Maybe.of('Россия')
//   ) → Maybe(null)
// ---------------------------------------------------------------------------

// TODO: реализуй liftA4 по аналогии с liftA2/liftA3
// const liftA4 = curry((fn, f1, f2, f3, f4) => f1.map(fn).ap(f2).ap(f3).ap(f4));

const formatAddress = curry(
  (street: string, city: string, region: string, country: string): string => {
    // TODO: `${street}, ${city}, ${region}, ${country}`
    return ''; // TODO-заглушка
  }
);

const safeFormatAddress = (
  maybeStreet: Maybe<string>,
  maybeCity: Maybe<string>,
  maybeRegion: Maybe<string>,
  maybeCountry: Maybe<string>
): Maybe<string> => {
  // TODO: liftA4(formatAddress, maybeStreet, maybeCity, maybeRegion, maybeCountry)
  return Maybe.of(null); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function testValue<A>(description: string, actual: Maybe<A>, expectedValue: A | null): void {
  const actualVal = actual instanceof Maybe ? actual.value : actual;
  const match = JSON.stringify(actualVal) === JSON.stringify(expectedValue);

  if (match) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expectedValue)}`);
    console.error(`    Получено:  ${JSON.stringify(actualVal)}`);
    failed++;
  }
}

function testNothing<A>(description: string, actual: Maybe<A>): void {
  const isNothing = actual instanceof Maybe && actual.isNothing;
  if (isNothing) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: Maybe(null)`);
    console.error(`    Получено:  ${actual?.inspect?.()}`);
    failed++;
  }
}

console.log('\n--- Упражнение 3: liftA2 / liftA3 ---\n');

// 3.1 safeAdd через liftA2
console.log('3.1 safeAdd через liftA2:');
testValue('safeAdd(Maybe(2), Maybe(3)) → Maybe(5)', safeAdd(Maybe.of(2), Maybe.of(3)), 5);
testValue('safeAdd(Maybe(100), Maybe(-50)) → Maybe(50)', safeAdd(Maybe.of(100), Maybe.of(-50)), 50);
testNothing('safeAdd(Maybe(null), Maybe(3)) → Maybe(null)', safeAdd(Maybe.of(null), Maybe.of(3)));
testNothing('safeAdd(Maybe(2), Maybe(null)) → Maybe(null)', safeAdd(Maybe.of(2), Maybe.of(null)));

// 3.2 safeRange
console.log('\n3.2 safeRange — диапазон через liftA2:');
testValue(
  'safeRange(Maybe(1), Maybe(4)) → Maybe([1, 2, 3, 4])',
  safeRange(Maybe.of(1), Maybe.of(4)),
  [1, 2, 3, 4]
);
testValue(
  'safeRange(Maybe(3), Maybe(3)) → Maybe([3])',
  safeRange(Maybe.of(3), Maybe.of(3)),
  [3]
);
testValue(
  'safeRange(Maybe(5), Maybe(3)) → Maybe([]) при min > max',
  safeRange(Maybe.of(5), Maybe.of(3)),
  []
);
testNothing('safeRange(Maybe(null), Maybe(4)) → Maybe(null)', safeRange(Maybe.of(null), Maybe.of(4)));
testNothing('safeRange(Maybe(1), Maybe(null)) → Maybe(null)', safeRange(Maybe.of(1), Maybe.of(null)));

// 3.3 safeBetween
console.log('\n3.3 safeBetween — проверка вхождения через liftA3:');
testValue(
  'safeBetween(Maybe(1), Maybe(10), Maybe(5)) → Maybe(true)',
  safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(5)),
  true
);
testValue(
  'safeBetween(Maybe(1), Maybe(10), Maybe(15)) → Maybe(false)',
  safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(15)),
  false
);
testValue(
  'safeBetween(Maybe(5), Maybe(5), Maybe(5)) → Maybe(true) — граничное значение',
  safeBetween(Maybe.of(5), Maybe.of(5), Maybe.of(5)),
  true
);
testNothing(
  'safeBetween(Maybe(1), Maybe(10), Maybe(null)) → Maybe(null)',
  safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(null))
);
testNothing(
  'safeBetween(Maybe(null), Maybe(10), Maybe(5)) → Maybe(null)',
  safeBetween(Maybe.of(null), Maybe.of(10), Maybe.of(5))
);

// 3.4 safeFormatAddress через liftA4
console.log('\n3.4 safeFormatAddress — адрес через liftA4:');
testValue(
  'safeFormatAddress с полными данными → строка адреса',
  safeFormatAddress(
    Maybe.of('ул. Ленина'),
    Maybe.of('Москва'),
    Maybe.of('Московская обл.'),
    Maybe.of('Россия')
  ),
  'ул. Ленина, Москва, Московская обл., Россия'
);
testNothing(
  'safeFormatAddress с null в городе → Maybe(null)',
  safeFormatAddress(
    Maybe.of('ул. Ленина'),
    Maybe.of(null),
    Maybe.of('Московская обл.'),
    Maybe.of('Россия')
  )
);
testNothing(
  'safeFormatAddress с null в стране → Maybe(null)',
  safeFormatAddress(
    Maybe.of('ул. Ленина'),
    Maybe.of('Москва'),
    Maybe.of('Московская обл.'),
    Maybe.of(null)
  )
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
