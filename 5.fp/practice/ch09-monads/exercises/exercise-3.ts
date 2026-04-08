/**
 * Упражнение 3: Either chain — валидационный пайплайн
 * Сложность: средняя
 *
 * Задача:
 *   Построить пайплайн регистрации пользователя через chain.
 *   Каждая функция валидации возвращает Either:
 *     Right(data) — данные прошли проверку, передаём дальше
 *     Left(msg)   — ошибка, цепочка останавливается
 *
 *   Ключевое отличие от предыдущей главы:
 *   В прошлой главе validateUser использовала цепочку if + ранний return,
 *   потому что не было chain. Теперь каждая проверка — отдельная функция,
 *   которую можно передать прямо в .chain().
 *
 * Запуск:
 *   npx tsx exercise-3.ts
 */

import { type Either, Left, Right } from "./containers.ts";

// ---------------------------------------------------------------------------
// Типы данных
// ---------------------------------------------------------------------------

export interface UserData {
  email: unknown;
  password: unknown;
  username: unknown;
}

// ---------------------------------------------------------------------------
// Задание 3.1 — validateUsername
//
// Напиши функцию validateUsername(data), которая принимает объект data
// и проверяет поле data.username:
//   1. Должно быть строкой               → Left('Имя пользователя должно быть строкой')
//   2. Длина от 3 до 20 символов         → Left('Имя пользователя должно содержать от 3 до 20 символов')
//   3. Только буквы и цифры (a-z, A-Z, 0-9, а-яА-ЯёЁ)
//                                        → Left('Имя пользователя должно содержать только буквы и цифры')
//   4. Иначе                             → Right(data)
//
// Важно: функция принимает весь объект data и возвращает Right(data) —
// так цепочка chain передаёт полный объект на следующий шаг.
//
// Пример:
//   validateUsername({ username: 'alice42' })   → Right({ username: 'alice42' })
//   validateUsername({ username: 'ab' })         → Left('Имя пользователя должно содержать от 3 до 20 символов')
//   validateUsername({ username: 'alice!' })     → Left('Имя пользователя должно содержать только буквы и цифры')
// ---------------------------------------------------------------------------

export const validateUsername = (data: UserData): Either<string, UserData> => {
  if (typeof data.username !== "string") {
    return Left.of("Имя пользователя должно быть строкой");
  }
  const length = data.username.length;

  if (length < 3 || length > 20) {
    return Left.of("Имя пользователя должно содержать от 3 до 20 символов");
  }

  if (!/^[a-zA-Zа-яА-ЯёЁ0-9]+$/.test(data.username)) {
    return Left.of("Имя пользователя должно содержать только буквы и цифры");
  }

  return Right.of(data);
};

// ---------------------------------------------------------------------------
// Задание 3.2 — validatePassword
//
// Напиши функцию validatePassword(data), которая проверяет data.password:
//   1. Должно быть строкой               → Left('Пароль должен быть строкой')
//   2. Минимум 8 символов                → Left('Пароль должен содержать минимум 8 символов')
//   3. Должен содержать хотя бы одну цифру → Left('Пароль должен содержать хотя бы одну цифру')
//   4. Должен содержать хотя бы одну букву → Left('Пароль должен содержать хотя бы одну букву')
//   5. Иначе                             → Right(data)
//
// Пример:
//   validatePassword({ password: 'secret42' })  → Right({...})
//   validatePassword({ password: 'short1' })    → Left('Пароль должен содержать минимум 8 символов')
//   validatePassword({ password: '12345678' })  → Left('Пароль должен содержать хотя бы одну букву')
// ---------------------------------------------------------------------------

export const validatePassword = (data: UserData): Either<string, UserData> => {
  if (typeof data.password !== "string") {
    return Left.of("Пароль должен быть строкой");
  }

  if (data.password.length < 8) {
    return Left.of("Пароль должен содержать минимум 8 символов");
  }
  const hasLetter = /[a-zA-Zа-яА-ЯёЁ]/.test(data.password);
  const hasDigit = /\d/.test(data.password);

  if (!hasLetter) {
    return Left.of("Пароль должен содержать хотя бы одну букву");
  }

  if (!hasDigit) {
    return Left.of("Пароль должен содержать хотя бы одну цифру");
  }

  return Right.of(data);
};

// ---------------------------------------------------------------------------
// Задание 3.3 — validateEmail
//
// Напиши функцию validateEmail(data), которая проверяет data.email:
//   1. Должно быть строкой               → Left('Email должен быть строкой')
//   2. Должно содержать '@'              → Left('Email должен содержать @')
//   3. Должно содержать '.' после '@'   → Left('Email должен содержать точку после @')
//   4. Иначе                             → Right(data)
//
// Для проверки 3: символ '.' должен встречаться после '@'
//   например: str.split('@')[1]?.includes('.')
//
// Пример:
//   validateEmail({ email: 'user@mail.ru' })   → Right({...})
//   validateEmail({ email: 'noatsign' })        → Left('Email должен содержать @')
//   validateEmail({ email: 'user@nodot' })      → Left('Email должен содержать точку после @')
// ---------------------------------------------------------------------------

export const validateEmail = (data: UserData): Either<string, UserData> => {
  // TODO
  return undefined as unknown as Either<string, UserData>;
};

// ---------------------------------------------------------------------------
// Задание 3.4 — registerUser
//
// Собери все три функции в пайплайн через chain.
// Функция принимает объект { username, password, email }
// и возвращает объект результата.
//
// Пример:
//   registerUser({ username: 'alice', password: 'secret42', email: 'alice@mail.ru' })
//   → { success: true, user: { username: 'alice', password: 'secret42', email: 'alice@mail.ru' } }
//
//   registerUser({ username: 'al', password: 'secret42', email: 'alice@mail.ru' })
//   → { success: false, error: 'Имя пользователя должно содержать от 3 до 20 символов' }
//
// Важно: первая ошибка останавливает цепочку.
// Порядок проверок: username → password → email.
// ---------------------------------------------------------------------------

export type RegisterResult = { error: string; success: false } | { success: true; user: UserData };

export const registerUser = (data: UserData): RegisterResult => {
  // TODO: Right.of(data)
  //         .chain(validateUsername)
  //         .chain(validatePassword)
  //         .chain(validateEmail)
  //         .fold(...)
  return undefined as unknown as RegisterResult;
};

// ---------------------------------------------------------------------------
// Задание 3.5 — демонстрация "первая ошибка останавливает цепочку"
//
// Напиши функцию firstErrorWins(data), которая возвращает строку:
//   — имя поля, которое не прошло проверку первым ('username' | 'password' | 'email')
//   — или 'ok', если все проверки прошли
//
// Реализуй через тот же chain-пайплайн, но с другим fold.
//
// Пример:
//   firstErrorWins({ username: 'a', password: 'nope', email: 'bad' }) → 'username'
//   firstErrorWins({ username: 'alice', password: 'nope', email: 'bad' }) → 'password'
//   firstErrorWins({ username: 'alice', password: 'secret42', email: 'bad' }) → 'email'
//   firstErrorWins({ username: 'alice', password: 'secret42', email: 'a@b.ru' }) → 'ok'
// ---------------------------------------------------------------------------

export type FieldName = "email" | "ok" | "password" | "username";

export const firstErrorWins = (data: UserData): FieldName => {
  // Подсказка: в fold для Left получаешь сообщение об ошибке.
  // Определи, какое сообщение соответствует какому полю,
  // и верни имя поля.
  //
  // Альтернатива: добавь в каждую функцию валидации метку поля в Left,
  // например Left({ field: 'username', message: '...' })
  // и обработай её в fold.
  //
  // Для простоты — используй проверку через includes или startsWith:
  //   if (msg.includes('пользователя')) return 'username';
  // TODO
  return undefined as unknown as FieldName;
};
