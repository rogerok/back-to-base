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
 *   npx tsx exercise-4.ts
 */

import { Right, Left, curry, liftA2, type Either } from './containers.ts';

// ---------------------------------------------------------------------------
// Вспомогательные функции валидации
// ---------------------------------------------------------------------------

// validateName: Right(name) если имя не пустое, иначе Left с ошибкой
const validateName = (name: string): Either<string, string> => {
  if (typeof name === 'string' && name.trim().length > 0) {
    return Right.of(name.trim());
  }
  return Left.of('Имя не может быть пустым');
};

// validateEmail: Right(email) если есть @, иначе Left с ошибкой
const validateEmail = (email: string): Either<string, string> => {
  if (typeof email === 'string' && email.includes('@')) {
    return Right.of(email.toLowerCase());
  }
  return Left.of('Некорректный email: отсутствует @');
};

// validateAge: Right(age) если число от 0 до 150, иначе Left с ошибкой
const validateAge = (age: number): Either<string, number> => {
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

interface UserData {
  name: string;
  email: string;
  age: number;
}

const createUser = curry(
  (name: string, email: string, age: number): UserData => ({ name, email, age })
);

const validateAndCreateUser = (
  name: string,
  email: string,
  age: number
): Either<string, UserData> => {
  // TODO:
  // const eitherName  = validateName(name);
  // const eitherEmail = validateEmail(email);
  // const eitherAge   = validateAge(age);
  // Right.of(createUser).ap(eitherName).ap(eitherEmail).ap(eitherAge)
  return Left.of('не реализовано'); // TODO-заглушка
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

const add = curry((a: number, b: number): number => a + b);

const safeParse = (str: string): Either<string, number> => {
  // TODO:
  // const n = parseFloat(str);
  // isNaN(n) ? Left.of(`Не число: "${str}"`) : Right.of(n)
  return Left.of('не реализовано'); // TODO-заглушка
};

const parseAndAdd = (strA: string, strB: string): Either<string, number> => {
  // TODO: liftA2(add, safeParse(strA), safeParse(strB))
  return Left.of('не реализовано'); // TODO-заглушка
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

interface FormData {
  name: string;
  email: string;
  age: number;
}

const validateForm = (form: FormData): Either<string, UserData> => {
  // TODO: Right.of(createUser).ap(validateName(form.name)).ap(validateEmail(form.email)).ap(validateAge(form.age))
  return Left.of('не реализовано'); // TODO-заглушка
};

const validateFormSequential = (form: FormData): Either<string, UserData> => {
  // TODO: через chain
  // validateName(form.name).chain(name =>
  //   validateEmail(form.email).chain(email =>
  //     validateAge(form.age).map(age => ({ name, email, age }))
  //   )
  // )
  return Left.of('не реализовано'); // TODO-заглушка
};


export { validateAndCreateUser, parseAndAdd, validateForm, validateFormSequential };
