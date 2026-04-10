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
 *   node exercise-3.js
 */

import { Maybe, curry, liftA2, liftA3 } from './containers.js';

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

const add = curry((a, b) => a + b);

const safeAdd = (maybeA, maybeB) => {
  // TODO: liftA2(add, maybeA, maybeB)
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

const makeRange = curry((min, max) => {
  // TODO: вернуть массив от min до max включительно, или [] если min > max
  // Подсказка: Array.from({ length: max - min + 1 }, (_, i) => min + i)
});

const safeRange = (maybeMin, maybeMax) => {
  // TODO: liftA2(makeRange, maybeMin, maybeMax)
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

const between = curry((min, max, val) => {
  // TODO: val >= min && val <= max
});

const safeBetween = (maybeMin, maybeMax, maybeVal) => {
  // TODO: liftA3(between, maybeMin, maybeMax, maybeVal)
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

const formatAddress = curry((street, city, region, country) => {
  // TODO: `${street}, ${city}, ${region}, ${country}`
});

const safeFormatAddress = (maybeStreet, maybeCity, maybeRegion, maybeCountry) => {
  // TODO: liftA4(formatAddress, maybeStreet, maybeCity, maybeRegion, maybeCountry)
};


export { safeAdd, safeRange, safeBetween, safeFormatAddress };
