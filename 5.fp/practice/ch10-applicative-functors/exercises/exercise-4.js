/**
 * Упражнение 4: Either ap — комбинирование валидаций
 * Сложность: средняя-сложная
 *
 * Задача:
 *   Научиться использовать ap с Either для комбинирования
 *   независимых шагов валидации.
 *
 *   Either работает как Maybe, но Left содержит описание ошибки:
 *     Right(value) — успех, значение передаётся дальше
 *     Left("сообщение") — ошибка, цепочка прерывается
 *
 *   При использовании ap:
 *     Right(fn).ap(Right(x))   → Right(fn(x))
 *     Right(fn).ap(Left(err))  → Left(err)    ← ошибка в значении
 *     Left(err).ap(Right(x))   → Left(err)    ← ошибка в функции
 *     Left(err).ap(Left(err2)) → Left(err)    ← первая ошибка "побеждает"
 *
 * Запуск:
 *   node exercise-4.js
 */

import { Right, Left, curry, liftA2 } from './containers.js';

// ---------------------------------------------------------------------------
// Вспомогательные функции валидации
// ---------------------------------------------------------------------------

// validateName: Right(name) если имя не пустое, иначе Left с ошибкой
const validateName = (name) => {
  if (typeof name === 'string' && name.trim().length > 0) {
    return Right.of(name.trim());
  }
  return Left.of('Имя не может быть пустым');
};

// validateEmail: Right(email) если есть @, иначе Left с ошибкой
const validateEmail = (email) => {
  if (typeof email === 'string' && email.includes('@')) {
    return Right.of(email.toLowerCase());
  }
  return Left.of('Некорректный email: отсутствует @');
};

// validateAge: Right(age) если число от 0 до 150, иначе Left с ошибкой
const validateAge = (age) => {
  if (typeof age === 'number' && age >= 0 && age <= 150) {
    return Right.of(age);
  }
  return Left.of('Возраст должен быть числом от 0 до 150');
};

// ---------------------------------------------------------------------------
// Задание 4.1 — создание пользователя из трёх валидированных полей
//
// Напиши функцию validateAndCreateUser(name, email, age),
// которая валидирует каждый аргумент НЕЗАВИСИМО и, если все три корректны,
// возвращает Right({ name, email, age }).
//
// Если ЛЮБОЕ поле невалидно — вернуть Left с сообщением об ошибке.
// (При нескольких ошибках сработает только ПЕРВАЯ — это ограничение простого Either)
//
// Алгоритм:
//   1. Получи Right/Left для каждого поля через validateName, validateEmail, validateAge
//   2. Создай каррированную функцию createUser(name, email, age) → объект
//   3. Комбинируй через ap: Right.of(createUser).ap(eitherName).ap(eitherEmail).ap(eitherAge)
//
// Пример:
//   validateAndCreateUser('Иван', 'ivan@example.com', 25)
//     → Right({ name: 'Иван', email: 'ivan@example.com', age: 25 })
//
//   validateAndCreateUser('', 'ivan@example.com', 25)
//     → Left('Имя не может быть пустым')
//
//   validateAndCreateUser('Иван', 'не-email', 25)
//     → Left('Некорректный email: отсутствует @')
// ---------------------------------------------------------------------------

const createUser = curry((name, email, age) => ({ name, email, age }));

const validateAndCreateUser = (name, email, age) => {
  // TODO:
  // const eitherName  = validateName(name);
  // const eitherEmail = validateEmail(email);
  // const eitherAge   = validateAge(age);
  // Right.of(createUser).ap(eitherName).ap(eitherEmail).ap(eitherAge)
};

// ---------------------------------------------------------------------------
// Задание 4.2 — парсинг строк и сложение через liftA2
//
// Напиши функцию parseAndAdd(strA, strB), которая:
//   1. Парсит каждую строку в число (parseFloat)
//   2. Если строка не является числом — Left('Не число: "{str}"')
//   3. Если обе строки — числа — Right(a + b)
//
// Используй liftA2 для сложения двух Either.
//
// Подсказка:
//   const safeParse = (str) => ...
//   liftA2(add, safeParse(strA), safeParse(strB))
//
// Пример:
//   parseAndAdd('3.5', '1.5')   → Right(5)
//   parseAndAdd('10', '-4')     → Right(6)
//   parseAndAdd('abc', '5')     → Left('Не число: "abc"')
//   parseAndAdd('3', 'xyz')     → Left('Не число: "xyz"')
// ---------------------------------------------------------------------------

const add = curry((a, b) => a + b);

const safeParse = (str) => {
  // TODO:
  // const n = parseFloat(str);
  // isNaN(n) ? Left.of(`Не число: "${str}"`) : Right.of(n)
};

const parseAndAdd = (strA, strB) => {
  // TODO: liftA2(add, safeParse(strA), safeParse(strB))
};

// ---------------------------------------------------------------------------
// Задание 4.3 — ограничение простого Either и его последствия
//
// С chain каждый шаг зависит от предыдущего — первая ошибка останавливает всё.
// С ap аргументы НЕЗАВИСИМЫ, но наш простой Either всё равно сохраняет
// только ПЕРВУЮ ошибку (Left "побеждает" Left).
//
// Реализуй validateForm(form) — полная валидация формы регистрации.
// form = { name, email, age }
//
// Используй ap для независимой валидации трёх полей.
// Вернуть Right(form) если все поля корректны, иначе Left с ПЕРВОЙ ошибкой.
//
// Напиши также validateFormSequential(form) — то же самое, но через chain.
// Убедись (через тесты), что обе версии возвращают ОДИНАКОВЫЙ Left при
// единственной ошибке, но разные Left при нескольких ошибках.
//
// Пример при нескольких ошибках:
//   validateForm({ name: '', email: 'не-email', age: 25 })
//     → Left('Имя не может быть пустым')     ← первая ошибка из ap-цепочки
//
//   validateFormSequential({ name: '', email: 'не-email', age: 25 })
//     → Left('Имя не может быть пустым')     ← первая ошибка из chain-цепочки
//
//   — в обоих случаях результат одинаков!
//   Отличие в ПРИНЦИПЕ: ap может комбинировать независимо, chain — нет.
// ---------------------------------------------------------------------------

const validateForm = (form) => {
  // TODO: Right.of(createUser).ap(validateName(form.name)).ap(validateEmail(form.email)).ap(validateAge(form.age))
};

const validateFormSequential = (form) => {
  // TODO: через chain
  // validateName(form.name).chain(name =>
  //   validateEmail(form.email).chain(email =>
  //     validateAge(form.age).map(age => ({ name, email, age }))
  //   )
  // )
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function testRight(description, actual, expectedValue) {
  const isRight = actual instanceof Right;
  if (!isRight) {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидался Right, получен: ${actual?.inspect?.()}`);
    failed++;
    return;
  }
  const match = JSON.stringify(actual._value) === JSON.stringify(expectedValue);
  if (match) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: Right(${JSON.stringify(expectedValue)})`);
    console.error(`    Получено:  Right(${JSON.stringify(actual._value)})`);
    failed++;
  }
}

function testLeft(description, actual, expectedError) {
  const isLeft = actual instanceof Left;
  if (isLeft && actual._value === expectedError) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: Left("${expectedError}")`);
    console.error(`    Получено:  ${actual?.inspect?.()}`);
    failed++;
  }
}

function testIsLeft(description, actual) {
  if (actual instanceof Left) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидался Left, получено: ${actual?.inspect?.()}`);
    failed++;
  }
}

console.log('\n--- Упражнение 4: Either ap — комбинирование валидаций ---\n');

// 4.1 validateAndCreateUser
console.log('4.1 validateAndCreateUser:');
testRight(
  'все поля корректны → Right({ name, email, age })',
  validateAndCreateUser('Иван', 'ivan@example.com', 25),
  { name: 'Иван', email: 'ivan@example.com', age: 25 }
);
testRight(
  'email приводится к lowercase',
  validateAndCreateUser('Анна', 'ANNA@TEST.COM', 30),
  { name: 'Анна', email: 'anna@test.com', age: 30 }
);
testLeft(
  'пустое имя → Left с ошибкой имени',
  validateAndCreateUser('', 'ivan@example.com', 25),
  'Имя не может быть пустым'
);
testLeft(
  'некорректный email → Left с ошибкой email',
  validateAndCreateUser('Иван', 'не-email', 25),
  'Некорректный email: отсутствует @'
);
testLeft(
  'возраст 200 → Left с ошибкой возраста',
  validateAndCreateUser('Иван', 'ivan@example.com', 200),
  'Возраст должен быть числом от 0 до 150'
);
testIsLeft(
  'пустое имя + некорректный email → всё равно Left (первая ошибка)',
  validateAndCreateUser('', 'не-email', 25)
);

// 4.2 parseAndAdd
console.log('\n4.2 parseAndAdd — парсинг и сложение:');
testRight('parseAndAdd("3.5", "1.5") → Right(5)', parseAndAdd('3.5', '1.5'), 5);
testRight('parseAndAdd("10", "-4") → Right(6)', parseAndAdd('10', '-4'), 6);
testRight('parseAndAdd("0", "0") → Right(0)', parseAndAdd('0', '0'), 0);
testLeft(
  'parseAndAdd("abc", "5") → Left с ошибкой',
  parseAndAdd('abc', '5'),
  'Не число: "abc"'
);
testLeft(
  'parseAndAdd("3", "xyz") → Left с ошибкой',
  parseAndAdd('3', 'xyz'),
  'Не число: "xyz"'
);

// 4.3 validateForm vs validateFormSequential
console.log('\n4.3 validateForm — ap vs chain при единственной ошибке дают одинаковый Left:');

const validForm = { name: 'Мария', email: 'maria@test.com', age: 28 };
const nameErrorForm = { name: '', email: 'maria@test.com', age: 28 };
const emailErrorForm = { name: 'Мария', email: 'не-email', age: 28 };

testRight('validateForm (valid) → Right', validateForm(validForm), validForm);
testRight('validateFormSequential (valid) → Right', validateFormSequential(validForm), validForm);

testLeft(
  'validateForm (ошибка имени) → Left',
  validateForm(nameErrorForm),
  'Имя не может быть пустым'
);
testLeft(
  'validateFormSequential (ошибка имени) → тот же Left',
  validateFormSequential(nameErrorForm),
  'Имя не может быть пустым'
);
testLeft(
  'validateForm (ошибка email) → Left',
  validateForm(emailErrorForm),
  'Некорректный email: отсутствует @'
);
testLeft(
  'validateFormSequential (ошибка email) → тот же Left',
  validateFormSequential(emailErrorForm),
  'Некорректный email: отсутствует @'
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
