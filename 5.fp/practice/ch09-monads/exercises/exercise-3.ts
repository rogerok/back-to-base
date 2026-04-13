import { expect, it } from 'vitest';

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

import { Right, Left, type Either } from "./containers.ts";

// ---------------------------------------------------------------------------
// Типы данных
// ---------------------------------------------------------------------------

interface UserData {
  username: unknown;
  password: unknown;
  email: unknown;
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

const validateUsername = (data: UserData): Either<string, UserData> => {
  // TODO: проверки по порядку, в конце Right(data)
  //
  // Подсказка для регулярного выражения:
  //   /^[a-zA-Zа-яА-ЯёЁ0-9]+$/.test(data.username)
  return undefined as unknown as Either<string, UserData>;
};

// ---------------------------------------------------------------------------
// Задание 3.2 — validatePassword
//роль должен содержать минимум 8 символов')
//   3. Должен содержать хотя бы одну цифру → Left('Пароль должен содержать хотя бы одну цифру')
//   4. Должен содержать хотя бы одну букву → Left('Парольдолжен содержать хотя бы одну букву')
//   5. Иначе                             → Right(data)
//
// Пример:
//   validatePassword({ password: 'secret42' })  → Right({...})
//   validatePassword({ password: 'short1' })    → Left('Пароль должен содержать минимум 8 символов')
//   validatePassword({ password: '12345678' })  → Left('Пароль должен содержать хотя бы одну букву')
// ---------------------------------------------------------------------------

const validatePassword = (data: UserData): Either<string, UserData> => {
  // TODO
  //
  // Подсказки:
  //   /\d/.test(str)  — есть ли цифра
  //   /[a-zA-Zа-яА-ЯёЁ]/.test(str)  — есть ли буква
  return undefined as unknown as Either<string, UserData>;
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

const validateEmail = (data: UserData): Either<string, UserData> => {
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

type RegisterResult =
  | { success: true; user: UserData }
  | { success: false; error: string };

const registerUser = (data: UserData): RegisterResult => {
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

type FieldName = "username" | "password" | "email" | "ok";

const firstErrorWins = (data: UserData): FieldName => {
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

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

function test(description: string, actual: unknown, expected: unknown): void {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
}

function foldEither(
  either: Either<string, UserData> | undefined,
): string | undefined {
  if (!either) return undefined;
  if (either instanceof Left) return `LEFT:${either._value}`;
  return "RIGHT";
}

console.log("\n--- Упражнение 3: Either chain — валидационный пайплайн ---\n");

// 3.1 validateUsername
console.log("3.1 validateUsername:");
test(
  "корректный username",
  foldEither(
    validateUsername({ username: "alice42", password: "", email: "" }),
  ),
  "RIGHT",
);
test(
  "однобуквенный",
  foldEither(validateUsername({ username: "ab", password: "", email: "" })),
  "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
);
test(
  "слишком длинный",
  foldEither(
    validateUsername({ username: "a".repeat(21), password: "", email: "" }),
  ),
  "LEFT:Имя пользователя должно содержать от 3 до 20 символов",
);
test(
  "спецсимволы",
  foldEither(validateUsername({ username: "user!", password: "", email: "" })),
  "LEFT:Имя пользователя должно содержать только буквы и цифры",
);
test(
  "не строка",
  foldEither(validateUsername({ username: 42, password: "", email: "" })),
  "LEFT:Имя пользователя должно быть строкой",
);
test(
  "русское имя",
  foldEither(validateUsername({ username: "Алиса", password: "", email: "" })),
  "RIGHT",
);
test(
  "ровно 3 символа — ok",
  foldEither(validateUsername({ username: "ali", password: "", email: "" })),
  "RIGHT",
);
test(
  "ровно 20 символов — ok",
  foldEither(
    validateUsername({ username: "a".repeat(20), password: "", email: "" }),
  ),
  "RIGHT",
);

// 3.2 validatePassword
console.log("\n3.2 validatePassword:");
test(
  "корректный пароль",
  foldEither(
    validatePassword({ username: "", password: "secret42", email: "" }),
  ),
  "RIGHT",
);
test(
  "слишком короткий",
  foldEither(validatePassword({ username: "", password: "sec1", email: "" })),
  "LEFT:Пароль должен содержать минимум 8 символов",
);
test(
  "нет цифры",
  foldEither(
    validatePassword({ username: "", password: "secretsecret", email: "" }),
  ),
  "LEFT:Пароль должен содержать хотя бы одну цифру",
);
test(
  "нет буквы",
  foldEither(
    validatePassword({ username: "", password: "12345678", email: "" }),
  ),
  "LEFT:Пароль должен содержать хотя бы одну букву",
);
test(
  "не строка",
  foldEither(validatePassword({ username: "", password: 12345678, email: "" })),
  "LEFT:Пароль должен быть строкой",
);
test(
  "ровно 8 символов — ok",
  foldEither(
    validatePassword({ username: "", password: "secret4!", email: "" }),
  ),
  "RIGHT",
);

// 3.3 validateEmail
console.log("\n3.3 validateEmail:");
test(
  "корректный email",
  foldEither(
    validateEmail({ username: "", password: "", email: "user@mail.ru" }),
  ),
  "RIGHT",
);
test(
  "нет @",
  foldEither(
    validateEmail({ username: "", password: "", email: "usermail.ru" }),
  ),
  "LEFT:Email должен содержать @",
);
test(
  "нет точки после @",
  foldEither(
    validateEmail({ username: "", password: "", email: "user@nodot" }),
  ),
  "LEFT:Email должен содержать точку после @",
);
test(
  "не строка",
  foldEither(validateEmail({ username: "", password: "", email: 42 })),
  "LEFT:Email должен быть строкой",
);

// 3.4 registerUser
console.log("\n3.4 registerUser:");
{
  const valid = registerUser({
    username: "alice",
    password: "secret42",
    email: "alice@mail.ru",
  });
  test(
    "все данные верны → success",
    (valid as { success: boolean })?.success,
    true,
  );
  test(
    "все данные верны → user есть",
    !!(valid as { user?: unknown })?.user,
    true,
  );

  const badUsername = registerUser({
    username: "al",
    password: "secret42",
    email: "alice@mail.ru",
  });
  test(
    "плохой username → success false",
    (badUsername as { success: boolean })?.success,
    false,
  );
  test(
    "плохой username → ошибка про username",
    (badUsername as { error?: string })?.error?.includes("пользователя"),
    true,
  );

  const badPassword = registerUser({
    username: "alice",
    password: "short",
    email: "alice@mail.ru",
  });
  test(
    "плохой пароль → success false",
    (badPassword as { success: boolean })?.success,
    false,
  );
  test(
    "плохой пароль → ошибка про пароль",
    (badPassword as { error?: string })?.error?.includes("Пароль"),
    true,
  );

  const badEmail = registerUser({
    username: "alice",
    password: "secret42",
    email: "invalid",
  });
  test(
    "плохой email → success false",
    (badEmail as { success: boolean })?.success,
    false,
  );
  test(
    "плохой email → ошибка про email",
    (badEmail as { error?: string })?.error?.includes("Email"),
    true,
  );
}

// 3.5 firstErrorWins
console.log("\n3.5 firstErrorWins — первая ошибка останавливает цепочку:");
test(
  "ошибка на username — останавливается на нём",
  firstErrorWins({ username: "a", password: "nope11", email: "bad" }),
  "username",
);
test(
  "username ok, ошибка на password",
  firstErrorWins({ username: "alice", password: "nope", email: "bad" }),
  "password",
);
test(
  "username и password ok, ошибка на email",
  firstErrorWins({ username: "alice", password: "secret42", email: "bad" }),
  "email",
);
test(
  "все ok → ok",
  firstErrorWins({ username: "alice", password: "secret42", email: "a@b.ru" }),
  "ok",
);
