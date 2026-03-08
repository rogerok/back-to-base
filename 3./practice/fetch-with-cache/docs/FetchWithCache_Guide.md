# fetchWithCache: исчерпывающий учебный материал

## Часть 0. Общая картина — что ты строишь

Ты строишь функцию `fetchWithCache(urls)`, которая:
1. Принимает массив URL
2. Для каждого URL — проверяет кэш, если нет — делает HTTP-запрос
3. Все запросы идут **параллельно**
4. Если запрос вернул **5xx** — повторяет с нарастающей задержкой (exponential backoff + jitter)
5. Если запрос вернул **4xx** — отменяет ВСЕ остальные запросы
6. Если прошло **больше 10 секунд** — отменяет ВСЕ запросы
7. Успешные результаты сохраняет в LRU-кэш

Вот как это выглядит в виде потока:

```
fetchWithCache(["url1", "url2", "url3"])
  │
  │  Шаг 1: Создать AbortController + таймаут 10 сек
  │
  ├── url1: в кэше? ДА → вернуть из кэша
  ├── url2: в кэше? НЕТ → fetch(url2, {signal})
  │     ├── 200 → сохранить в кэш, вернуть
  │     ├── 5xx → подождать, retry (до N раз)
  │     └── 4xx → abort() ВСЕ запросы, ошибка
  └── url3: в кэше? НЕТ → fetch(url3, {signal})
        └── ...

  Все запросы идут параллельно через Promise.allSettled
```

---

## Часть 1. LRU Cache — у тебя уже есть

Ты уже реализовал `LRUCache` в `2.oop-structures/practice/memoize/lru-cache.ts`.
Он использует `Map` и имеет `get`, `set`, `delete`. Ты можешь использовать
его напрямую или скопировать.

Для этой задачи тебе из кэша нужны только три операции:
- `cache.get(url)` — есть ли ответ для этого URL?
- `cache.set(url, data)` — сохранить ответ
- Автоматическое вытеснение старых записей при переполнении

Кэш работает как ассоциативный массив:
```
ключ (URL)                    → значение (данные ответа)
"https://api.example.com/1"   → { id: 1, name: "Alice" }
"https://api.example.com/2"   → { id: 2, name: "Bob" }
```

---

## Часть 2. Fetch API — чего ты можешь не знать

### fetch не бросает ошибку при 4xx/5xx

Это самое контринтуитивное в fetch API. Многие думают, что `fetch("url")`
выбросит ошибку, если сервер ответит 404 или 500. **Нет.**

```ts
const response = await fetch("https://example.com/not-found");
// response.status === 404
// response.ok === false
// НО: промис resolved, не rejected!
// Ошибки нет. fetch считает, что запрос прошёл успешно —
// он получил ответ от сервера.
```

fetch бросает ошибку **только** при сетевых проблемах:
- Нет интернета
- DNS не найден
- Сервер не отвечает вообще (таймаут на уровне сети)
- Запрос был отменён через `AbortController`

**Это значит:** тебе нужно самому проверять `response.status` и решать,
что с ним делать:

```ts
const response = await fetch(url);

if (response.ok) {
  // 200-299: всё хорошо
  return await response.json();
}

if (response.status >= 400 && response.status < 500) {
  // 4xx: ошибка клиента — retry бессмысленен
  throw new Error(`Client error: ${response.status}`);
}

if (response.status >= 500) {
  // 5xx: ошибка сервера — можно retry
  throw new Error(`Server error: ${response.status}`);
}
```

### Почему 4xx нельзя retry, а 5xx можно?

**4xx — ошибка клиента:**
- 400 Bad Request — ты отправил невалидные данные
- 401 Unauthorized — нет авторизации
- 403 Forbidden — нет прав доступа
- 404 Not Found — ресурс не существует

Повторный запрос с теми же данными даст тот же результат. Ничего не изменится.

**5xx — ошибка сервера:**
- 500 Internal Server Error — баг на сервере, может быть временный
- 502 Bad Gateway — прокси не достучался до бэкенда
- 503 Service Unavailable — сервер перегружен
- 504 Gateway Timeout — прокси не дождался ответа

Через секунду сервер может прийти в норму. Retry имеет смысл.

---

## Часть 3. AbortController — механизм отмены

### Проблема: как отменить fetch?

Ты вызвал `fetch(url)` — он ушёл в сеть. Как его остановить? `fetch`
возвращает промис, а у промиса нет метода `cancel()`. Он просто... висит
и ждёт ответа.

`AbortController` — это ответ на эту проблему. Он был добавлен в стандарт
специально для отмены fetch-запросов.

### Как это работает — два объекта

```ts
const controller = new AbortController();
// controller — "пульт управления" с одной кнопкой: abort()
// controller.signal — "маячок", который подключается к fetch
```

Аналогия: представь пульт от телевизора.
- `controller` — пульт (у тебя в руках)
- `controller.signal` — ИК-приёмник на телевизоре (подключён к fetch)
- `controller.abort()` — нажатие кнопки "выключить"

```ts
// 1. Создаём пульт
const controller = new AbortController();

// 2. Подключаем маячок к fetch
const response = await fetch(url, { signal: controller.signal });
//                                   ^^^^^^^^^^^^^^^^^^^^^^^^
//                                   fetch "слушает" этот signal

// 3. Где-то в другом месте нажимаем "отмену"
controller.abort();
// → fetch немедленно завершается с ошибкой AbortError
```

### Что происходит при abort()

Когда ты вызываешь `controller.abort()`:

1. `signal.aborted` становится `true`
2. Все fetch-запросы, которым передан этот signal, **немедленно** завершаются
3. Их промисы reject-ятся с ошибкой типа `AbortError`
4. Если ответ уже начал приходить — он прерывается

```ts
try {
  const response = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err.name === "AbortError") {
    // Запрос был отменён — это НЕ ошибка сети, НЕ ошибка сервера.
    // Мы сами его отменили. Обрабатываем по-особому.
    console.log("Запрос отменён");
  } else {
    // Реальная ошибка сети
    throw err;
  }
}
```

### Один controller — много запросов

Один signal можно передать в несколько fetch. Тогда `abort()` отменит
их **все** разом:

```ts
const controller = new AbortController();

// Три запроса — один signal
const p1 = fetch(url1, { signal: controller.signal });
const p2 = fetch(url2, { signal: controller.signal });
const p3 = fetch(url3, { signal: controller.signal });

// Одним вызовом отменяем ВСЕ три
controller.abort();
```

**Именно это тебе нужно для задачи:** один AbortController на все запросы.
Если один вернул 4xx или прошло 10 секунд — `abort()` убивает все остальные.

### Таймаут через AbortController

```ts
const controller = new AbortController();

// Через 10 секунд — отменить всё
const timeoutId = setTimeout(() => controller.abort(), 10_000);

// ... делаем запросы ...

// Если запросы завершились раньше — отменяем таймер,
// иначе он сработает даже когда уже не нужен
clearTimeout(timeoutId);
```

**Зачем `clearTimeout`?**
Без него: запросы завершились за 2 секунды, но через 10 секунд таймер
всё равно вызовет `abort()`. Это не страшно (запросы уже завершены),
но это мусор — лучше убрать.

### Проверка: был ли signal уже отменён

Перед тем как делать retry, полезно проверить — не отменён ли уже signal:

```ts
if (signal.aborted) {
  // Не начинаем retry — всё уже отменено
  throw new DOMException("Aborted", "AbortError");
}
```

Это важно для retry-логики: если между retry-попытками кто-то вызвал
`abort()` (таймаут или 4xx от другого запроса), не нужно делать новый fetch.

---

## Часть 4. Retry с Exponential Backoff + Jitter

### Зачем нужен retry

Сервер вернул 503 (Service Unavailable). Что делать?
- Вариант 1: сдаться → плохо, через секунду сервер может ожить
- Вариант 2: повторить сразу → если 1000 клиентов повторят сразу, сервер
  снова упадёт
- Вариант 3: подождать и повторить → правильно, но сколько ждать?

### Наивный retry — почему плох

```ts
// Плохо: retry каждую секунду
async function naiveRetry(url, maxRetries) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetch(url);
    } catch {
      await sleep(1000); // всегда 1 секунда
    }
  }
}
```

Проблема: если сервер упал на 5 секунд, ты сделаешь 5 запросов по одному
в секунду. Но если **1000 клиентов** делают то же самое — сервер получит
5000 запросов за эти 5 секунд. Он не успеет восстановиться.

### Exponential Backoff — удвоение задержки

Идея: каждая следующая попытка ждёт **вдвое дольше**:

```
Попытка 0: подождать 100ms   → запрос
Попытка 1: подождать 200ms   → запрос
Попытка 2: подождать 400ms   → запрос
Попытка 3: подождать 800ms   → запрос
Попытка 4: подождать 1600ms  → запрос
```

Формула:
```
delay = baseDelay * 2^attempt
```

Это **экспоненциальный** рост (отсюда название). Сервер получает всё меньше
запросов с каждой секундой, что даёт ему время восстановиться.

### Проблема: Thundering Herd (стадо громыхающих бизонов)

Даже с exponential backoff есть проблема. Если 1000 клиентов **одновременно**
получили ошибку:

```
Клиент 1:  [ошибка] → ждёт 100ms → retry → ждёт 200ms → retry
Клиент 2:  [ошибка] → ждёт 100ms → retry → ждёт 200ms → retry
Клиент 3:  [ошибка] → ждёт 100ms → retry → ждёт 200ms → retry
...
Клиент 1000: [ошибка] → ждёт 100ms → retry → ждёт 200ms → retry
```

Все 1000 клиентов ждут **одинаковое** время. Через 100ms они все
одновременно шлют retry. Это и есть "thundering herd" — стадо бизонов,
которое одновременно бросается в одну дверь.

### Jitter — добавляем случайность

Jitter (дрожание) — добавление случайного шума к задержке.
Вместо того чтобы все клиенты ждали ровно 100ms, один ждёт 37ms,
другой 82ms, третий 95ms:

```
Клиент 1:  [ошибка] → ждёт 37ms  → retry
Клиент 2:  [ошибка] → ждёт 82ms  → retry
Клиент 3:  [ошибка] → ждёт 95ms  → retry
Клиент 4:  [ошибка] → ждёт 12ms  → retry
```

Retry-запросы **размазываются** по времени. Сервер получает их постепенно,
а не все сразу.

**Full Jitter (рекомендуется AWS):**
```ts
const delay = Math.random() * baseDelay * Math.pow(2, attempt);
```

`Math.random()` возвращает число от 0 до 1. Значит delay будет
случайным числом **от 0 до `baseDelay * 2^attempt`**.

Пример (baseDelay = 100ms, attempt = 2):
- Максимум: 100 * 4 = 400ms
- Реальный delay: случайное число от 0 до 400ms

### Максимальная задержка (cap)

Без ограничения delay растёт бесконечно:
```
attempt 10: 100 * 1024 = 102400ms = 102 секунды
```

Это слишком. Нужен cap (потолок):

```ts
const maxDelay = 5000; // не больше 5 секунд
const delay = Math.min(maxDelay, Math.random() * baseDelay * Math.pow(2, attempt));
```

### Паттерн: функция sleep

Retry-логике нужна "пауза". В JS нет `sleep()`, но его легко сделать:

```ts
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Использование:
await sleep(500); // подождать 500ms, потом продолжить
```

**Как это работает:**
1. `new Promise(resolve => ...)` — создаёт промис
2. `setTimeout(resolve, ms)` — через `ms` миллисекунд вызывает `resolve`
3. `await` — приостанавливает выполнение, пока промис не resolve-ится

Результат: код "засыпает" на `ms` миллисекунд.

### Паттерн: sleep с поддержкой отмены

Обычный `sleep` нельзя отменить. Если ты вызвал `await sleep(5000)`, и через
1 секунду пришёл `abort()` — sleep всё равно проспит все 5 секунд.

Решение — sleep, который слушает AbortSignal:

```ts
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // Если уже отменён — сразу reject
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    // Если отменят во время сна — проснуться раньше
    signal?.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}
```

Теперь если во время ожидания между retry вызовут `abort()` — sleep
прервётся немедленно, а не будет ждать полный delay.

---

## Часть 5. Promise.allSettled — почему не Promise.all

### Проблема с Promise.all

```ts
const results = await Promise.all([
  fetch(url1),
  fetch(url2),
  fetch(url3),
]);
```

Если **хотя бы один** промис reject-ится — `Promise.all` немедленно
reject-ится целиком. Результаты остальных промисов **теряются**.

Для твоей задачи это проблематично: один URL может быть в кэше (мгновенный
результат), другой может получить 5xx и retry-иться. Ты не хочешь потерять
кэшированный результат из-за ошибки в другом запросе.

### Promise.allSettled — ждёт всех

```ts
const results = await Promise.allSettled([
  fetch(url1),
  fetch(url2),
  fetch(url3),
]);

// results — массив, каждый элемент:
// { status: "fulfilled", value: Response }  — успех
// { status: "rejected", reason: Error }     — ошибка
```

`Promise.allSettled` **всегда** ждёт завершения всех промисов.
Никогда не reject-ится сам. Ты получаешь полную картину:
какие запросы успешны, какие нет.

### Но подожди — а как тогда отменять все при 4xx?

Хороший вопрос. `Promise.allSettled` ждёт всех, но ты хочешь отменить
остальные при 4xx. Как совместить?

Ответ: **AbortController делает это за тебя.**

Когда один запрос получает 4xx и вызывает `controller.abort()`:
- Все остальные fetch-запросы reject-ятся с `AbortError`
- `Promise.allSettled` дождётся этих reject-ов (они мгновенные)
- Ты получишь результат: один `rejected` с "Client error 404",
  остальные `rejected` с "AbortError"

```ts
const results = await Promise.allSettled(
  urls.map(url => fetchSingleUrl(url, controller))
);

// results:
// [
//   { status: "rejected", reason: Error("Client error: 404") },
//   { status: "rejected", reason: DOMException("AbortError") },
//   { status: "rejected", reason: DOMException("AbortError") },
// ]
```

---

## Часть 6. Архитектура решения — три слоя

Разбей решение на три функции, каждая отвечает за свой уровень:

```
fetchWithCache(urls)              ← уровень 3: координация
  ├── кэш, AbortController, таймаут, Promise.allSettled
  │
  └── fetchSingleUrl(url, signal) ← уровень 2: один URL с retry
        ├── проверка статуса, решение retry/abort
        │
        └── fetch(url, {signal})  ← уровень 1: нативный fetch
```

### Уровень 1: fetch (уже есть)
Просто `fetch(url, { signal })`. Ничего писать не нужно.

### Уровень 2: fetchSingleUrl — один запрос с retry

Эта функция:
1. Делает `fetch(url, { signal })`
2. Проверяет статус ответа
3. При 2xx — возвращает данные
4. При 4xx — вызывает `abort()` и бросает ошибку
5. При 5xx — ждёт (backoff + jitter) и делает retry
6. При `AbortError` — просто пробрасывает ошибку (не retry)

```
fetchSingleUrl(url, signal, controller)
  │
  ├── attempt 0: fetch → 503 → sleep(random 0-100ms)
  ├── attempt 1: fetch → 502 → sleep(random 0-200ms)
  ├── attempt 2: fetch → 200 → return data ✓
  │
  ├── ИЛИ: fetch → 404 → controller.abort() → throw
  ├── ИЛИ: fetch → AbortError → throw (не retry)
  └── ИЛИ: attempt > maxRetries → throw
```

### Уровень 3: fetchWithCache — координация

Эта функция:
1. Создаёт `AbortController` и таймаут
2. Для каждого URL — проверяет кэш
3. Запускает все запросы через `Promise.allSettled`
4. Сохраняет успешные результаты в кэш
5. Очищает таймер
6. Возвращает результаты

---

## Часть 7. Тонкие моменты, о которых легко забыть

### 1. AbortError — не retry

При retry нужно различать три типа ошибок:

```ts
catch (err) {
  if (err.name === "AbortError") {
    // Кто-то вызвал abort() — таймаут или 4xx от другого запроса.
    // НЕ retry! Просто пробрасываем.
    throw err;
  }
  if (err instanceof ClientError) {
    // 4xx — НЕ retry
    throw err;
  }
  // Сетевая ошибка или 5xx — можно retry
}
```

Если ты будешь retry-ить AbortError — получишь бесконечный цикл:
abort → retry → fetch с тем же signal → снова abort → retry → ...

### 2. Проверяй signal перед retry

Между попытками (во время sleep) signal может быть отменён:

```ts
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  // ... fetch и sleep ...
}
```

### 3. Что класть в кэш

Кэшируй **распарсенные данные**, а не `Response`:

```ts
// Плохо: Response.body можно прочитать только ОДИН раз
cache.set(url, response);

// Хорошо: данные можно использовать сколько угодно раз
const data = await response.json();
cache.set(url, data);
```

`Response.json()` / `Response.text()` потребляют stream тела ответа.
Второй вызов вернёт ошибку "body already consumed". Поэтому кэшируй
результат парсинга, а не сам Response.

### 4. Гонка: кэш vs fetch

Если в массиве urls есть дубликаты:
```ts
fetchWithCache(["url1", "url1", "url1"])
```

Все три пойдут в fetch параллельно (кэш ещё пуст). Это нормально для
минимальной реализации. Продвинутое решение — дедуплицировать запросы,
но это выходит за рамки задачи.

### 5. clearTimeout — не забудь

```ts
const timeoutId = setTimeout(() => controller.abort(), 10_000);
try {
  // ... запросы ...
} finally {
  clearTimeout(timeoutId); // ← обязательно!
}
```

`finally` гарантирует, что таймер очистится и при успехе, и при ошибке.

---

## Часть 8. Порядок реализации

Делай в таком порядке — каждый шаг можно протестировать отдельно:

### Шаг 1: sleep(ms)

```ts
function sleep(ms: number): Promise<void>
```

Протестируй: `await sleep(1000)` → подождал секунду? Работает.

### Шаг 2: sleep с AbortSignal

```ts
function sleep(ms: number, signal?: AbortSignal): Promise<void>
```

Протестируй: создай controller, вызови sleep(5000, signal), через 100ms
вызови abort() → sleep прервался раньше? Работает.

### Шаг 3: fetchSingleUrl без retry

Просто fetch + проверка статуса. Без retry, без кэша.

```ts
async function fetchSingleUrl(url: string, signal: AbortSignal): Promise<any>
```

Протестируй с реальным URL (например, `jsonplaceholder.typicode.com`).

### Шаг 4: Добавь retry с backoff + jitter

Протестируй: попробуй URL, который отдаёт 5xx (можно использовать
`httpstat.us/500` — сервис, который всегда возвращает 500).

### Шаг 5: fetchWithCache — собери всё

Добавь кэш, AbortController, таймаут, Promise.allSettled.

### Шаг 6: Протестируй граничные случаи

- Все URL в кэше → fetch вообще не вызывается
- Один URL отдаёт 404 → все отменяются
- Таймаут 10 секунд → все отменяются
- 5xx → retry работает, потом 200 → успех

---

## Часть 9. Полезные URL для тестирования

- `https://jsonplaceholder.typicode.com/posts/1` — всегда 200, возвращает JSON
- `https://httpstat.us/500` — всегда 500
- `https://httpstat.us/404` — всегда 404
- `https://httpstat.us/200?sleep=15000` — 200, но отвечает через 15 секунд (для теста таймаута)
- `https://httpstat.us/503` — всегда 503 (Service Unavailable)

---

## Часть 10. Чеклист для самопроверки

### Функциональность
- [ ] Параллельные запросы ко всем URL
- [ ] Cache hit — если URL в кэше, fetch не вызывается
- [ ] Cache miss — результат сохраняется в кэш после успешного fetch
- [ ] 4xx → abort() всех запросов
- [ ] 5xx → retry с exponential backoff + jitter
- [ ] Таймаут 10 секунд → abort() всех
- [ ] AbortError не retry-ится
- [ ] maxRetries — не бесконечные повторы

### Корректность
- [ ] clearTimeout после завершения
- [ ] Проверка signal.aborted перед retry
- [ ] Кэшируются данные (json/text), а не Response
- [ ] sleep прерывается при abort

### Понимание
- [ ] Могу объяснить, зачем jitter (thundering herd)
- [ ] Могу объяснить, почему Promise.allSettled, а не Promise.all
- [ ] Могу объяснить, почему 4xx не retry, а 5xx retry
- [ ] Могу объяснить, как один AbortController отменяет все fetch
