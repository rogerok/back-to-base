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
 *   node exercise-3.js
 */

import { Right, Left } from './containers.js';

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

const validateUsername = (data) => {
  // TODO: проверки по порядку, в конце Right(data)
  //
  // Подсказка для регулярного выражения:
  //   /^[a-zA-Zа-яА-ЯёЁ0-9]+$/.test(data.username)
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

const validatePassword = (data) => {
  // TODO
  //
  // Подсказки:
  //   /\d/.test(str)  — есть ли цифра
  //   /[a-zA-Zа-яА-ЯёЁ]/.test(str)  — есть ли буква
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

const validateEmail = (data) => {
  // TODO
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

const registerUser = (data) => {
  // TODO: Right.of(data)
  //         .chain(validateUsername)
  //         .chain(validatePassword)
  //         .chain(validateEmail)
  //         .fold(...)
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

const firstErrorWins = (data) => {
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

function foldEither(either) {
  return either?.fold(
    (err) => `LEFT:${err}`,
    () => 'RIGHT'
  );
}

console.log('\n--- Упражнение 3: Either chain — валидационный пайплайн ---\n');

// 3.1 validateUsername
console.log('3.1 validateUsername:');
test('корректный username',    foldEither(validateUsername({ username: 'alice42' })), 'RIGHT');
test('однобуквенный',          foldEither(validateUsername({ username: 'ab' })),
  'LEFT:Имя пользователя должно содержать от 3 до 20 символов');
test('слишком длинный',        foldEither(validateUsername({ username: 'a'.repeat(21) })),
  'LEFT:Имя пользователя должно содержать от 3 до 20 символов');
test('спецсимволы',            foldEither(validateUsername({ username: 'user!' })),
  'LEFT:Имя пользователя должно содержать только буквы и цифры');
test('не строка',              foldEither(validateUsername({ username: 42 })),
  'LEFT:Имя пользователя должно быть строкой');
test('русское имя',            foldEither(validateUsername({ username: 'Алиса' })), 'RIGHT');
test('ровно 3 символа — ok',   foldEither(validateUsername({ username: 'ali' })), 'RIGHT');
test('ровно 20 символов — ok', foldEither(validateUsername({ username: 'a'.repeat(20) })), 'RIGHT');

// 3.2 validatePassword
console.log('\n3.2 validatePassword:');
test('корректный пароль',      foldEither(validatePassword({ password: 'secret42' })), 'RIGHT');
test('слишком короткий',       foldEither(validatePassword({ password: 'sec1' })),
  'LEFT:Пароль должен содержать минимум 8 символов');
test('нет цифры',              foldEither(validatePassword({ password: 'secretsecret' })),
  'LEFT:Пароль должен содержать хотя бы одну цифру');
test('нет буквы',              foldEither(validatePassword({ password: '12345678' })),
  'LEFT:Пароль должен содержать хотя бы одну букву');
test('не строка',              foldEither(validatePassword({ password: 12345678 })),
  'LEFT:Пароль должен быть строкой');
test('ровно 8 символов — ok',  foldEither(validatePassword({ password: 'secret4!' })), 'RIGHT');

// 3.3 validateEmail
console.log('\n3.3 validateEmail:');
test('корректный email',       foldEither(validateEmail({ email: 'user@mail.ru' })), 'RIGHT');
test('нет @',                  foldEither(validateEmail({ email: 'usermail.ru' })),
  'LEFT:Email должен содержать @');
test('нет точки после @',      foldEither(validateEmail({ email: 'user@nodot' })),
  'LEFT:Email должен содержать точку после @');
test('не строка',              foldEither(validateEmail({ email: 42 })),
  'LEFT:Email должен быть строкой');

// 3.4 registerUser
console.log('\n3.4 registerUser:');
{
  const valid = registerUser({ username: 'alice', password: 'secret42', email: 'alice@mail.ru' });
  test('все данные верны → success',           valid?.success, true);
  test('все данные верны → user есть',         !!valid?.user,  true);

  const badUsername = registerUser({ username: 'al', password: 'secret42', email: 'alice@mail.ru' });
  test('плохой username → success false',      badUsername?.success, false);
  test('плохой username → ошибка про username',
    badUsername?.error?.includes('пользователя'), true);

  const badPassword = registerUser({ username: 'alice', password: 'short', email: 'alice@mail.ru' });
  test('плохой пароль → success false',        badPassword?.success, false);
  test('плохой пароль → ошибка про пароль',
    badPassword?.error?.includes('Пароль'), true);

  const badEmail = registerUser({ username: 'alice', password: 'secret42', email: 'invalid' });
  test('плохой email → success false',         badEmail?.success, false);
  test('плохой email → ошибка про email',
    badEmail?.error?.includes('Email'), true);
}

// 3.5 firstErrorWins
console.log('\n3.5 firstErrorWins — первая ошибка останавливает цепочку:');
test(
  'ошибка на username — останавливается на нём',
  firstErrorWins({ username: 'a', password: 'nope11', email: 'bad' }),
  'username'
);
test(
  'username ok, ошибка на password',
  firstErrorWins({ username: 'alice', password: 'nope', email: 'bad' }),
  'password'
);
test(
  'username и password ok, ошибка на email',
  firstErrorWins({ username: 'alice', password: 'secret42', email: 'bad' }),
  'email'
);
test(
  'все ok → ok',
  firstErrorWins({ username: 'alice', password: 'secret42', email: 'a@b.ru' }),
  'ok'
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
