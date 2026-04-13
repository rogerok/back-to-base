/**
 * Упражнение 3: Either — валидация с информацией об ошибке
 * Сложность: средняя
 *
 * Задача:
 *   Использовать Either для валидации данных. Left хранит сообщение об ошибке,
 *   Right — корректное значение. Научиться строить цепочки валидаций и
 *   обрабатывать оба пути через fold.
 *
 * Запуск:
 *   node exercise-3.js
 */

import { Right, Left } from './containers.js';

// ---------------------------------------------------------------------------
// Задание 3.1
// Напиши функцию validateEmail, которая проверяет строку по правилам:
//   1. Должна быть строкой        → Left('Email должен быть строкой')
//   2. Не должна быть пустой      → Left('Email не может быть пустым')
//   3. Должна содержать '@'       → Left('Email должен содержать @')
//   4. Иначе                      → Right(email)
//
// Проверки должны идти именно в таком порядке.
//
// Пример:
//   validateEmail('user@mail.com') → Right('user@mail.com')
//   validateEmail('invalid')       → Left('Email должен содержать @')
//   validateEmail('')              → Left('Email не может быть пустым')
//   validateEmail(42)              → Left('Email должен быть строкой')
// ---------------------------------------------------------------------------

const validateEmail = (email) => {
  // TODO: серия if-проверок, каждая возвращает Left с нужным сообщением
  // В конце — Right(email)
};

// ---------------------------------------------------------------------------
// Задание 3.2
// Напиши функцию validateAge, которая проверяет число:
//   1. Должно быть числом          → Left('Возраст должен быть числом')
//   2. Должно быть >= 0            → Left('Возраст не может быть отрицательным')
//   3. Должно быть <= 150          → Left('Возраст не может превышать 150')
//   4. Иначе                       → Right(age)
//
// Пример:
//   validateAge(25)   → Right(25)
//   validateAge(-1)   → Left('Возраст не может быть отрицательным')
//   validateAge(200)  → Left('Возраст не может превышать 150')
//   validateAge('25') → Left('Возраст должен быть числом')
// ---------------------------------------------------------------------------

const validateAge = (age) => {
  // TODO
};

// ---------------------------------------------------------------------------
// Задание 3.3
// Напиши функцию validateUser, которая принимает объект { name, email, age }
// и проверяет все три поля. Возвращает:
//   — Right({ name, email, age }) если все поля корректны
//   — Left(сообщение) при первой встреченной ошибке
//
// Правило для name: должно быть непустой строкой,
//   иначе Left('Имя не может быть пустым').
//
// Используй validateEmail и validateAge внутри.
// Порядок проверок: name → email → age.
//
// Пример:
//   validateUser({ name: 'Иван', email: 'i@mail.ru', age: 30 })
//   → Right({ name: 'Иван', email: 'i@mail.ru', age: 30 })
//
//   validateUser({ name: '', email: 'i@mail.ru', age: 30 })
//   → Left('Имя не может быть пустым')
//
//   validateUser({ name: 'Иван', email: 'bad', age: 30 })
//   → Left('Email должен содержать @')
// ---------------------------------------------------------------------------

const validateUser = ({ name, email, age }) => {
  // Подсказка: у Right есть .map(), у Left — нет. Можно использовать
  // такой паттерн: если validateEmail возвращает Left, то .map на нём
  // ничего не делает и ошибка "проскользнёт" до конца.
  //
  // Но validateEmail и validateAge возвращают Either с разными значениями.
  // Как "передать управление" от одной проверки к следующей?
  // Подумай: можно ли после validateEmail вернуть validateAge(age)
  // внутри .map()? Что получится? (Either внутри Either — это нормально
  // пока, правильное решение через chain будет в следующей главе.)
  //
  // Для этого упражнения используй просто цепочку if + ранний return:
  // TODO
};

// ---------------------------------------------------------------------------
// Задание 3.4
// Напиши функцию parseJSON, которая безопасно парсит JSON-строку и
// возвращает Either:
//   — Right(parsedObject) при успехе
//   — Left(`Ошибка парсинга: ${e.message}`) при исключении
//
// Пример:
//   parseJSON('{"name":"Иван"}') → Right({ name: 'Иван' })
//   parseJSON('не json')         → Left('Ошибка парсинга: ...')
//   parseJSON('')                → Left('Ошибка парсинга: ...')
// ---------------------------------------------------------------------------

const parseJSON = (str) => {
  // TODO: try/catch — в catch возвращай Left с сообщением
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

// Вспомогательная функция: разворачивает Either в строку для сравнения
function foldEither(either) {
  return either?.fold(
    (err) => `LEFT:${err}`,
    (val) => `RIGHT:${typeof val === 'object' ? JSON.stringify(val) : val}`
  );
}

console.log('\n--- Упражнение 3: Either ---\n');

// 3.1 validateEmail
console.log('3.1 validateEmail:');
test('корректный email → Right',         foldEither(validateEmail('user@mail.com')), 'RIGHT:user@mail.com');
test('без @ → Left с нужным сообщением', foldEither(validateEmail('invalid')),       'LEFT:Email должен содержать @');
test('пустая строка → Left',             foldEither(validateEmail('')),              'LEFT:Email не может быть пустым');
test('число → Left',                     foldEither(validateEmail(42)),              'LEFT:Email должен быть строкой');
test('null → Left (не строка)',          foldEither(validateEmail(null)),            'LEFT:Email должен быть строкой');

// 3.2 validateAge
console.log('\n3.2 validateAge:');
test('25 → Right(25)',                    foldEither(validateAge(25)),    'RIGHT:25');
test('0 → Right(0) — граница',           foldEither(validateAge(0)),     'RIGHT:0');
test('150 → Right(150) — граница',       foldEither(validateAge(150)),   'RIGHT:150');
test('-1 → Left отрицательный',          foldEither(validateAge(-1)),    'LEFT:Возраст не может быть отрицательным');
test('200 → Left превышает 150',         foldEither(validateAge(200)),   'LEFT:Возраст не может превышать 150');
test('"25" → Left не число',             foldEither(validateAge('25')),  'LEFT:Возраст должен быть числом');

// 3.3 validateUser
console.log('\n3.3 validateUser:');
test(
  'валидный пользователь → Right',
  foldEither(validateUser({ name: 'Иван', email: 'i@mail.ru', age: 30 })),
  'RIGHT:' + JSON.stringify({ name: 'Иван', email: 'i@mail.ru', age: 30 })
);
test(
  'пустое имя → Left имя',
  foldEither(validateUser({ name: '', email: 'i@mail.ru', age: 30 })),
  'LEFT:Имя не может быть пустым'
);
test(
  'плохой email → Left email',
  foldEither(validateUser({ name: 'Иван', email: 'bad', age: 30 })),
  'LEFT:Email должен содержать @'
);
test(
  'плохой возраст → Left возраст',
  foldEither(validateUser({ name: 'Иван', email: 'i@mail.ru', age: -5 })),
  'LEFT:Возраст не может быть отрицательным'
);

// 3.4 parseJSON
console.log('\n3.4 parseJSON:');
test(
  'валидный JSON → Right',
  foldEither(parseJSON('{"name":"Иван"}')),
  'RIGHT:' + JSON.stringify({ name: 'Иван' })
);
test(
  'невалидный JSON → Left начинается с "Ошибка парсинга"',
  foldEither(parseJSON('не json'))?.startsWith('LEFT:Ошибка парсинга'),
  true
);
test(
  'пустая строка → Left',
  foldEither(parseJSON(''))?.startsWith('LEFT:Ошибка парсинга'),
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
