// Task 11: Container transforms & unwrapping
//
// Задача на конвертацию между контейнерами и извлечение значений.
// Каждая функция использует свой способ "достать" или "переложить" значение.
// Переписать все 8 функций, заменив ручные проверки на fp-ts конверторы.

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  username?: string;
  age?: number;
}

interface AppError {
  code: 'NOT_FOUND' | 'INVALID' | 'FETCH_FAILED';
  message: string;
}

// ─── 1. nullable → строка (Option → unwrap) ──────────────────────────────────
// Достать значение или вернуть дефолт
function getUsername(profile: Profile): string {
  return profile.username ?? 'anonymous';
}
// fp-ts: O.fromNullable  →  O.getOrElse

// ─── 2. nullable → Either (Option → Either) ──────────────────────────────────
// Отсутствующее значение стало ошибкой
function requireUsername(profile: Profile): string | AppError {
  if (!profile.username) {
    return { code: 'NOT_FOUND', message: 'username is required' };
  }
  return profile.username;
}
// fp-ts: O.fromNullable  →  E.fromOption(() => error)

// ─── 3. Either → Option (отбросить ошибку) ───────────────────────────────────
// Нам важен только успех, ошибка не нужна
function toOptionalAge(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0 || n > 120) return null;
  return n;
}
// fp-ts: E.right / E.left  →  O.fromEither  (или E.toOption)

// ─── 4. Either → развернуть в одно значение (fold) ───────────────────────────
// Оба случая (Left и Right) схлопываются в строку
function describeResult(raw: string): string {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return `Error: "${raw}" is not a number`;
  return `Parsed: ${n}`;
}
// fp-ts: E.fold(onLeft, onRight)

// ─── 5. Option → развернуть через match ──────────────────────────────────────
const ROLES: Record<number, string> = { 1: 'admin', 2: 'editor' };

function describeRole(userId: number): string {
  const role = ROLES[userId];
  if (role === undefined) return `User ${userId} has no role`;
  return `User ${userId} is ${role}`;
}
// fp-ts: O.fromNullable  →  O.match(onNone, onSome)  (= O.fold)

// ─── 6. Promise → TaskEither (обернуть и развернуть) ─────────────────────────
async function fetchData(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return JSON.stringify(data);
}

async function safeLoad(url: string): Promise<string> {
  try {
    return await fetchData(url);
  } catch (e) {
    return `Failed: ${(e as Error).message}`;
  }
}
// fp-ts: TE.tryCatch  →  TE.fold(onLeft, onRight)  →  запустить как Task

// ─── 7. Option → TaskEither (поднять синхронный результат в async поток) ─────
const cache = new Map<string, string>([['key1', 'cached-value']]);

async function loadWithCache(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`https://api.example.com/data/${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    cache.set(key, text);
    return text;
  } catch {
    return null;
  }
}
// fp-ts: O.fromNullable(cache.get(key))
//   → pipe( ..., TE.fromOption(() => error) )  — если нет в кэше, идём в сеть
//   → TE.orElse(...)  — если первый TE упал, пробуем второй

// ─── 8. вложенные контейнеры → flatten ───────────────────────────────────────
// Either<Error, Option<string>> → Either<Error, string>
// Бывает когда функция возвращает Either, а внутри — ещё Option
function findEmail(userId: number): { email?: string } | null {
  const users: Record<number, { email?: string }> = {
    1: { email: 'alice@example.com' },
    2: {},
  };
  return users[userId] ?? null;
}

function getEmailOrError(userId: number): string | AppError {
  const user = findEmail(userId);
  if (!user) return { code: 'NOT_FOUND', message: `User ${userId} not found` };
  if (!user.email) return { code: 'INVALID', message: 'email is missing' };
  return user.email;
}
// fp-ts: E.fromOption / O.fromNullable / E.chain — разложи Either<E, Option<A>> в Either<E, A>
