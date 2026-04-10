/**
 * Упражнение 5: Applicative vs Monad — выбираем правильный инструмент
 * Сложность: сложная
 *
 * Задача:
 *   Научиться различать ситуации, когда нужен ap (аргументы независимы),
 *   и когда нужен chain (следующий шаг зависит от результата предыдущего).
 *
 *   Правило большого пальца:
 *     - Независимые вычисления → ap / liftA2 / liftA3
 *       (можно было бы запустить параллельно)
 *     - Зависимые вычисления → chain
 *       (следующий шаг использует результат предыдущего)
 *
 *   Монада МОЩНЕЕ аппликатива (chain может всё, что ap, и ещё больше),
 *   но аппликатив ВЫРАЗИТЕЛЬНЕЕ там, где аргументы независимы:
 *   читатель явно видит, что шаги не связаны между собой.
 *
 * Запуск:
 *   npx tsx exercise-5.ts
 */

import { Maybe, Right, Left, IO, curry, liftA2, type Either } from './containers.ts';

// ---------------------------------------------------------------------------
// Симуляция "асинхронных" операций через IO
// (В реальности async/Promise — здесь упрощение для наглядности)
// ---------------------------------------------------------------------------

interface User {
  id: number;
  name: string;
  avatarId: string;
  statsId: string;
}

interface Avatar {
  url: string;
}

interface Stats {
  posts: number;
  followers: number;
}

interface Order {
  id: string;
  amount: number;
}

// База данных пользователей
const usersDB: Record<number, User> = {
  1: { id: 1, name: 'Алиса', avatarId: 'av_1', statsId: 'st_1' },
  2: { id: 2, name: 'Борис', avatarId: 'av_2', statsId: 'st_2' },
};

const avatarsDB: Record<string, Avatar> = {
  av_1: { url: 'https://cdn.example.com/alice.jpg' },
  av_2: { url: 'https://cdn.example.com/boris.jpg' },
};

const statsDB: Record<string, Stats> = {
  st_1: { posts: 42, followers: 1000 },
  st_2: { posts: 7, followers: 150 },
};

const ordersDB: Record<number, Order[]> = {
  1: [{ id: 'ord_1', amount: 500 }, { id: 'ord_2', amount: 1200 }],
  2: [{ id: 'ord_3', amount: 300 }],
};

// "Запросы" возвращают IO — все эффекты отложены до unsafePerformIO()
const fetchUser = (id: number): IO<Maybe<User>> =>
  new IO(() => (usersDB[id] ? Maybe.of(usersDB[id]) : Maybe.of(null)));

const fetchAvatar = (avatarId: string): IO<Maybe<Avatar>> =>
  new IO(() => (avatarsDB[avatarId] ? Maybe.of(avatarsDB[avatarId]) : Maybe.of(null)));

const fetchStats = (statsId: string): IO<Maybe<Stats>> =>
  new IO(() => (statsDB[statsId] ? Maybe.of(statsDB[statsId]) : Maybe.of(null)));

const fetchOrders = (userId: number): IO<Maybe<Order[]>> =>
  new IO(() => (ordersDB[userId] ? Maybe.of(ordersDB[userId]) : Maybe.of(null)));

// ---------------------------------------------------------------------------
// Задание 5.1 — профиль пользователя: независимые данные → ap
//
// Нужно собрать профиль пользователя: имя (из users), аватар (из avatars),
// статистику (из stats). Все три запроса НЕЗАВИСИМЫ друг от друга
// (аватар не нужен, чтобы получить статистику, и наоборот).
//
// НЕПРАВИЛЬНО (монадный способ — последовательно):
//   fetchUser(id)
//     .chain(user => fetchAvatar(user.avatarId)
//       .chain(avatar => fetchStats(user.statsId)
//         .map(stats => ({ user, avatar, stats }))))
//
//   Проблема: каждый запрос ждёт завершения предыдущего, хотя они не зависят.
//   В реальном коде с промисами это было бы три последовательных запроса!
//
// ПРАВИЛЬНО (аппликативный способ — независимо):
//   Все три IO запускаются "одновременно" (в реальности параллельно).
//
// Реализуй функцию buildProfileApplicative(userId), которая:
//   1. Получает пользователя через fetchUser(userId)
//   2. ОДНОВРЕМЕННО получает аватар и статистику
//   3. Собирает объект { name, avatarUrl, posts, followers }
//
// Подсказки:
//   - user, avatar, stats — это IO<Maybe<...>>
//   - Для комбинирования IO используй IO.ap:
//       IO.of(curriedFn).ap(ioA).ap(ioB)
//   - Внутри IO лежат Maybe — не забудь извлечь значения через .getOrElse(null)
//
// Ожидаемый результат (при запуске unsafePerformIO()):
//   {
//     name: 'Алиса',
//     avatarUrl: 'https://cdn.example.com/alice.jpg',
//     posts: 42,
//     followers: 1000
//   }
//
// Примечание: в этом упражнении fetchUser нужен сначала, чтобы получить
// avatarId и statsId — поэтому первый chain всё же оправдан.
// После этого аватар и статистика — НЕЗАВИСИМЫ.
// ---------------------------------------------------------------------------

interface Profile {
  name: string;
  avatarUrl: string;
  posts: number;
  followers: number;
}

const buildProfile = curry(
  (user: User, avatar: Avatar, stats: Stats): Profile => ({
    name: user.name,
    avatarUrl: avatar.url,
    posts: stats.posts,
    followers: stats.followers,
  })
);

// Версия с ap (правильная для независимых аватара и статистики):
const buildProfileApplicative = (userId: number): IO<Profile | null> => {
  // TODO:
  // Шаг 1: получаем пользователя (chain оправдан — avatarId и statsId нужны)
  // fetchUser(userId) возвращает IO(Maybe(user))
  // Нам нужно "добраться" до user и запустить два независимых запроса
  //
  // Подсказка по структуре:
  //   return new IO(() => {
  //     const maybeUser = fetchUser(userId).unsafePerformIO();
  //     const user = maybeUser.getOrElse(null);
  //     if (!user) return null;
  //
  //     const ioAvatar = fetchAvatar(user.avatarId);
  //     const ioStats  = fetchStats(user.statsId);
  //
  //     // Здесь используй IO.of(buildProfile).ap(ioUser).ap(ioAvatar).ap(ioStats)
  //     // где ioUser — это IO.of(user)
  //     // Не забудь: внутри IO лежат Maybe — извлеки через .getOrElse(null)
  //   });
  return IO.of(null); // TODO-заглушка: замени на свою реализацию
};

// Версия с chain (неправильная — последовательная):
const buildProfileSequential = (userId: number): IO<Profile | null> => {
  // TODO:
  // return new IO(() => {
  //   const maybeUser = fetchUser(userId).unsafePerformIO();
  //   const user = maybeUser.getOrElse(null);
  //   if (!user) return null;
  //   const maybeAvatar = fetchAvatar(user.avatarId).unsafePerformIO();
  //   const maybeStats  = fetchStats(user.statsId).unsafePerformIO();
  //   const avatar = maybeAvatar.getOrElse(null);
  //   const stats  = maybeStats.getOrElse(null);
  //   if (!avatar || !stats) return null;
  //   return buildProfile(user, avatar, stats);
  // });
  return IO.of(null); // TODO-заглушка: замени на свою реализацию
};

// ---------------------------------------------------------------------------
// Задание 5.2 — заказы пользователя: зависимые данные → chain
//
// Нужно получить заказы КОНКРЕТНОГО пользователя.
// Шаги:
//   1. Сначала получаем пользователя (нужен его id)
//   2. ПОТОМ (зависит от id!) получаем его заказы
//
// Здесь ap НЕ работает: мы не можем получить заказы, не зная id пользователя.
// Нужен chain.
//
// Реализуй fetchUserOrders(userId), которая возвращает список заказов
// в виде массива (или null если пользователь не найден).
//
// Подсказка: цепочка IO через chain:
//   fetchUser(userId) → IO(Maybe(user))
//   fetchOrders(user.id) → IO(Maybe(orders))
// ---------------------------------------------------------------------------

const fetchUserOrders = (userId: number): IO<Order[] | null> => {
  // TODO:
  // return new IO(() => {
  //   const maybeUser = fetchUser(userId).unsafePerformIO();
  //   const user = maybeUser.getOrElse(null);
  //   if (!user) return null;
  //   const maybeOrders = fetchOrders(user.id).unsafePerformIO();
  //   return maybeOrders.getOrElse(null);
  // });
  return IO.of(null); // TODO-заглушка: замени на свою реализацию
};

// ---------------------------------------------------------------------------
// Задание 5.3 — смешанная валидация формы
//
// Форма регистрации с такими правилами:
//   - name и email — независимы → валидируем через ap/liftA2
//   - password и confirmPassword — ЗАВИСИМЫ (confirmPassword проверяется
//     только если password уже прошёл валидацию) → chain
//
// Реализуй processForm(form), где form = { name, email, password, confirmPassword }
//
// Правила валидации:
//   - name: не пустая строка
//   - email: содержит @
//   - password: длина >= 8
//   - confirmPassword: совпадает с password (chain от результата validatePassword)
//
// Вернуть Right({ name, email, password }) или Left с первой ошибкой.
//
// Подсказки:
//   - validateName и validateEmail — независимы → liftA2 для получения [name, email]
//   - После получения [name, email] через chain проверяем password
//   - После password через chain проверяем confirmPassword
// ---------------------------------------------------------------------------

const validateName = (name: string): Either<string, string> =>
  typeof name === 'string' && name.trim().length > 0
    ? Right.of(name.trim())
    : Left.of('Имя не может быть пустым');

const validateEmail = (email: string): Either<string, string> =>
  typeof email === 'string' && email.includes('@')
    ? Right.of(email.toLowerCase())
    : Left.of('Некорректный email');

const validatePassword = (password: string): Either<string, string> =>
  typeof password === 'string' && password.length >= 8
    ? Right.of(password)
    : Left.of('Пароль должен содержать минимум 8 символов');

const validateConfirm =
  (password: string) =>
  (confirmPassword: string): Either<string, string> =>
    password === confirmPassword
      ? Right.of(password)
      : Left.of('Пароли не совпадают');

interface FormInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormResult {
  name: string;
  email: string;
  password: string;
}

const processForm = (form: FormInput): Either<string, FormResult> => {
  // TODO:
  // Шаг 1: независимая валидация name и email через liftA2
  //   const pairNameEmail = liftA2(
  //     curry((name, email) => [name, email]),
  //     validateName(form.name),
  //     validateEmail(form.email)
  //   );
  //
  // Шаг 2: chain для зависимой валидации password
  //   pairNameEmail.chain(([name, email]) =>
  //     validatePassword(form.password).chain(password =>
  //       validateConfirm(password)(form.confirmPassword).map(pwd =>
  //         ({ name, email, password: pwd })
  //       )
  //     )
  //   )
  return Left.of('не реализовано'); // TODO-заглушка: замени на свою реализацию
};

// ---------------------------------------------------------------------------
// Задание 5.4 — распознай правильный инструмент (квиз)
//
// Для каждого сценария укажи: 'ap' или 'chain'.
// Затем реализуй функцию, используя правильный инструмент.
//
// Все функции работают с Maybe<number>.
// ---------------------------------------------------------------------------

// Сценарий A: умножить два независимых Maybe-числа
// → какой инструмент? ap или chain?
// Реализуй: scenarioA(maybeA, maybeB) → Maybe<number>
const scenarioA = (maybeA: Maybe<number>, maybeB: Maybe<number>): Maybe<number> => {
  // ИНСТРУМЕНТ: ??? (ap или chain?)
  // TODO: реализуй умножение двух Maybe через правильный инструмент
  return Maybe.of(null); // TODO-заглушка
};

// Сценарий B: получить Maybe-число из массива по Maybe-индексу
// т.е. safeGet(arr, maybeIndex) → значение arr[index] или Maybe(null)
// → какой инструмент?
// Реализуй: scenarioB(arr, maybeIndex) → Maybe<number>
const scenarioB = (arr: number[], maybeIndex: Maybe<number>): Maybe<number> => {
  // ИНСТРУМЕНТ: ??? (ap или chain?)
  // Подсказка: значение зависит от индекса — мы не можем получить arr[index]
  //            не зная конкретного значения index.
  // TODO: maybeIndex.chain(index => Maybe.of(arr[index]))
  return Maybe.of(null); // TODO-заглушка
};

// Сценарий C: сложить три независимых Maybe-числа
// → какой инструмент?
// Реализуй: scenarioC(maybeA, maybeB, maybeC) → Maybe<number>
const scenarioC = (
  maybeA: Maybe<number>,
  maybeB: Maybe<number>,
  maybeC: Maybe<number>
): Maybe<number> => {
  // ИНСТРУМЕНТ: ??? (ap или chain?)
  // TODO: реализуй через правильный инструмент
  return Maybe.of(null); // TODO-заглушка
};

// Сценарий D: проверить, что Maybe-число положительное, затем взять квадратный корень
// т.е. если число <= 0 — Maybe(null), иначе Maybe(sqrt(x))
// → какой инструмент? (корень зависит от того, прошла ли проверка!)
// Реализуй: scenarioD(maybeNum) → Maybe<number>
const scenarioD = (maybeNum: Maybe<number>): Maybe<number> => {
  // ИНСТРУМЕНТ: ??? (ap или chain?)
  // Подсказка: Math.sqrt зависит от того, прошла ли проверка на > 0.
  //            Используй chain + filter или chain + map с проверкой.
  // TODO:
  // maybeNum.chain(n => n > 0 ? Maybe.of(Math.sqrt(n)) : Maybe.of(null))
  return Maybe.of(null); // TODO-заглушка
};


export {
  buildProfileApplicative,
  buildProfileSequential,
  fetchUserOrders,
  processForm,
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
};
