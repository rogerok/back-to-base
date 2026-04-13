import { expect, it } from 'vitest';

/**
 * Упражнение 5: Реальный пайплайн — Maybe + Either + IO
 * Сложность: сложная
 *
 * Задача:
 *   Собрать цельный пайплайн обработки данных, который комбинирует
 *   все три контейнера: IO для чтения, Either для валидации с ошибкой,
 *   Maybe для необязательных полей.
 *
 * Сценарий:
 *   Есть строка с JSON-конфигурацией пользователя. Нужно:
 *   1. Распарсить её (Either)
 *   2. Провалидировать обязательные поля (Either)
 *   3. Безопасно достать необязательные поля (Maybe)
 *   4. Вернуть отформатированный объект или сообщение об ошибке
 *
 * Запуск:
 *   npx tsx exercise-5.ts
 */

import { Maybe, Right, Left, IO, type Either } from './containers.ts';

// ---------------------------------------------------------------------------
// Вспомогательные функции — уже реализованы, используй их в пайплайне
// ---------------------------------------------------------------------------

// Безопасный парсинг JSON — возвращает Either
const parseJSON = (str: string): Either<string, unknown> => {
  try {
    return Right.of(JSON.parse(str));
  } catch (e) {
    const err = e as Error;
    return Left.of(`Невалидный JSON: ${err.message}`);
  }
};

// Безопасный доступ к свойству — возвращает Maybe
const safeProp = <K extends string>(key: K) =>
  (obj: Record<string, unknown>): Maybe<unknown> =>
    Maybe.of(obj[key]);

// ---------------------------------------------------------------------------
// Задание 5.1
// Напиши функцию validateRequiredFields(obj), которая проверяет наличие
// обязательных полей: id (число) и username (непустая строка).
//
// Возвращает:
//   Right(obj)                          — если оба поля корректны
//   Left('Поле id обязательно')         — если id отсутствует или не число
//   Left('Поле username обязательно')   — если username отсутствует или не строка или пустая
//
// Пример:
//   validateRequiredFields({ id: 1, username: 'alice' })   → Right({...})
//   validateRequiredFields({ username: 'alice' })           → Left('Поле id обязательно')
//   validateRequiredFields({ id: 1 })                       → Left('Поле username обязательно')
//   validateRequiredFields({ id: '1', username: 'alice' })  → Left('Поле id обязательно')
// ---------------------------------------------------------------------------

interface RequiredFields {
  id: number;
  username: string;
}

const validateRequiredFields = (obj: Record<string, unknown>): Either<string, RequiredFields> => {
  // TODO
  return null as any;
};

// ---------------------------------------------------------------------------
// Задание 5.2
// Напиши функцию extractOptionalFields(obj), которая достаёт
// необязательные поля и возвращает объект с дефолтными значениями:
//
//   {
//     email:  значение obj.email  или 'не указан',
//     age:    значение obj.age    или 0,
//     role:   значение obj.role   или 'user',
//   }
//
// Используй safeProp и .map(), .getOrElse() для каждого поля.
//
// Пример:
//   extractOptionalFields({ email: 'a@b.com', age: 25, role: 'admin' })
//   → { email: 'a@b.com', age: 25, role: 'admin' }
//
//   extractOptionalFields({})
//   → { email: 'не указан', age: 0, role: 'user' }
// ---------------------------------------------------------------------------

interface OptionalFields {
  email: string;
  age: number;
  role: string;
}

const extractOptionalFields = (obj: Record<string, unknown>): OptionalFields => {
  // TODO: для каждого поля использовать safeProp(key)(obj).getOrElse(дефолт)
  return null as any;
};

// ---------------------------------------------------------------------------
// Задание 5.3
// Напиши функцию formatUser(required, optional), которая объединяет
// обязательные и необязательные поля в одну строку:
//
//   `Пользователь #${id}: ${username} (${email}, ${age} лет, роль: ${role})`
//
// Пример:
//   formatUser(
//     { id: 7, username: 'alice' },
//     { email: 'a@b.com', age: 25, role: 'admin' }
//   )
//   → 'Пользователь #7: alice (a@b.com, 25 лет, роль: admin)'
// ---------------------------------------------------------------------------

const formatUser = (required: RequiredFields, optional: OptionalFields): string => {
  // TODO
  return null as any;
};

// ---------------------------------------------------------------------------
// Задание 5.4 — Итоговый пайплайн
// Напиши функцию processUserData(jsonString), которая:
//   1. Парсит jsonString через parseJSON → Either
//   2. Валидирует обязательные поля через validateRequiredFields → Either
//      (используй .map() на Either из шага 1)
//   3. Если оба шага успешны, достаёт необязательные поля и форматирует результат
//   4. Возвращает строку: отформатированного пользователя или сообщение об ошибке
//
// Возвращает строку (не Either):
//   — при успехе: результат formatUser(...)
//   — при ошибке: `Ошибка: ${сообщение из Left}`
//
// Подсказки:
//   — .map() на Right применяет функцию; на Left — пропускает.
//   — Проблема: validateRequiredFields сама возвращает Either, а .map() ожидает
//     обычное значение. Если обернуть Either в Either — получишь Right(Right(...))
//     или Right(Left(...)). Это неудобно, но решаемо: используй .fold() в конце,
//     чтобы "развернуть" вложенность вручную.
//   — Альтернатива (более элегантная, но выходит за рамки главы): метод chain.
//     Если ты уже реализовал chain в упражнении 4 — можешь попробовать добавить
//     его в Right/Left и использовать здесь.
//   — В шаге 2 правильным подходом без chain будет НЕ вкладывать Either в Either:
//     сначала получи значение из первого Either через .fold() или getOrElse(),
//     затем передай его в validateRequiredFields отдельно.
//
// Пример:
//   processUserData('{"id":1,"username":"alice","email":"a@b.com","age":25}')
//   → 'Пользователь #1: alice (a@b.com, 25 лет, роль: user)'
//
//   processUserData('{"username":"alice"}')
//   → 'Ошибка: Поле id обязательно'
//
//   processUserData('не json')
//   → 'Ошибка: Невалидный JSON: ...'
// ---------------------------------------------------------------------------

const processUserData = (jsonString: string): string => {
  // TODO
  //
  // Рекомендуемый скелет через fold:
  //
  // return parseJSON(jsonString).fold(
  //   (err) => `Ошибка: ${err}`,
  //   (obj) => validateRequiredFields(obj as Record<string, unknown>).fold(
  //     (err) => `Ошибка: ${err}`,
  //     (validated) => formatUser(validated, extractOptionalFields(obj as Record<string, unknown>))
  //   )
  // );
  return null as any;
};

// ---------------------------------------------------------------------------
// Задание 5.5 — IO-обёртка (бонус)
// Представь, что JSON-строка приходит не напрямую, а из "внешнего мира".
// Оберни processUserData в IO, чтобы сам вызов processUserData стал
// отложенным побочным эффектом.
//
// Напиши функцию createUserProcessor(jsonString):
//   — возвращает IO, который при unsafePerformIO() вызывает processUserData
//   — внутри IO добавь трансформацию: привести результат к верхнему регистру
//
// Пример:
//   const processor = createUserProcessor('{"id":1,"username":"bob","age":20}');
//   // Ничего не выполнено!
//   processor.unsafePerformIO();
//   // → 'ПОЛЬЗОВАТЕЛЬ #1: BOB (НЕ УКАЗАН, 20 ЛЕТ, РОЛЬ: USER)'
// ---------------------------------------------------------------------------

const createUserProcessor = (jsonString: string): IO<string> => {
  // TODO: new IO(...).map(result => result.toUpperCase())
  return null as any;
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

function test(description: string, actual: unknown, expected: unknown): void {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
}

console.log('\n--- Упражнение 5: Реальный пайплайн ---\n');

// 5.1 validateRequiredFields
console.log('5.1 validateRequiredFields:');
{
  const valid = validateRequiredFields({ id: 1, username: 'alice' });
  test('валидный объект → Right', valid?.fold?.(() => 'LEFT', () => 'RIGHT'), 'RIGHT');

  const noId = validateRequiredFields({ username: 'alice' });
  test('нет id → Left', noId?.fold?.(e => e, () => null), 'Поле id обязательно');

  const noUsername = validateRequiredFields({ id: 1 });
  test('нет username → Left', noUsername?.fold?.(e => e, () => null), 'Поле username обязательно');

  const stringId = validateRequiredFields({ id: '1', username: 'alice' });
  test('id строка → Left', stringId?.fold?.(e => e, () => null), 'Поле id обязательно');

  const emptyUsername = validateRequiredFields({ id: 1, username: '' });
  test('username пустой → Left', emptyUsername?.fold?.(e => e, () => null), 'Поле username обязательно');
}

// 5.2 extractOptionalFields
console.log('\n5.2 extractOptionalFields:');
{
  const full = extractOptionalFields({ email: 'a@b.com', age: 25, role: 'admin' });
  test('все поля есть → берём их',    full?.email, 'a@b.com');
  test('age из объекта',              full?.age,   25);
  test('role из объекта',             full?.role,  'admin');

  const empty = extractOptionalFields({});
  test('нет email → дефолт',  empty?.email, 'не указан');
  test('нет age → 0',         empty?.age,   0);
  test('нет role → "user"',   empty?.role,  'user');
}

// 5.3 formatUser
console.log('\n5.3 formatUser:');
{
  const result = formatUser(
    { id: 7, username: 'alice' },
    { email: 'a@b.com', age: 25, role: 'admin' }
  );
  test(
    'форматирование пользователя',
    result,
    'Пользователь #7: alice (a@b.com, 25 лет, роль: admin)'
  );
}

// 5.4 processUserData
console.log('\n5.4 processUserData:');
test(
  'полный валидный JSON',
  processUserData('{"id":1,"username":"alice","email":"a@b.com","age":25,"role":"admin"}'),
  'Пользователь #1: alice (a@b.com, 25 лет, роль: admin)'
);
test(
  'валидный JSON без необязательных полей',
  processUserData('{"id":2,"username":"bob"}'),
  'Пользователь #2: bob (не указан, 0 лет, роль: user)'
);
test(
  'нет поля id → ошибка',
  processUserData('{"username":"alice"}'),
  'Ошибка: Поле id обязательно'
);
test(
  'нет поля username → ошибка',
  processUserData('{"id":1}'),
  'Ошибка: Поле username обязательно'
);
test(
  'невалидный JSON → ошибка парсинга',
  processUserData('не json')?.startsWith('Ошибка: Невалидный JSON'),
  true
);
test(
  'пустая строка → ошибка парсинга',
  processUserData('')?.startsWith('Ошибка: Невалидный JSON'),
  true
);

// 5.5 IO-обёртка (бонус)
console.log('\n5.5 createUserProcessor (бонус, IO):');
{
  const processor = createUserProcessor('{"id":1,"username":"bob","age":20}');
  test(
    'createUserProcessor возвращает IO (не выполняет сразу)',
    typeof processor?.unsafePerformIO,
    'function'
  );
  test(
    'unsafePerformIO возвращает результат в верхнем регистре',
    processor?.unsafePerformIO?.(),
    'ПОЛЬЗОВАТЕЛЬ #1: BOB (НЕ УКАЗАН, 20 ЛЕТ, РОЛЬ: USER)'
  );
  const errorProcessor = createUserProcessor('{"id":"bad"}');
  test(
    'IO с ошибкой → тоже верхний регистр',
    errorProcessor?.unsafePerformIO?.(),
    'ОШИБКА: ПОЛЕ ID ОБЯЗАТЕЛЬНО'
  );
}
