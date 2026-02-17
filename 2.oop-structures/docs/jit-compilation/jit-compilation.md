# JIT-компиляция в V8 — конспект

> Оригинал: [Understanding Just-In-Time (JIT) Compilation in V8: A Deep Dive](https://medium.com/@rahul.jindal57/understanding-just-in-time-jit-compilation-in-v8-a-deep-dive-c98b09c6bf0c) — Rahul Jindal

---

## Что такое JIT

**JIT (Just-In-Time)** — гибридная стратегия: код не компилируется заранее (как в C/C++) и не просто интерпретируется построчно (как ранний JS). Вместо этого он компилируется **прямо во время выполнения**, по мере необходимости.

| Подход        | Когда компилируется                   | Примеры                 |
| ------------- | ------------------------------------- | ----------------------- |
| AOT           | До запуска                            | C, C++, Rust, Go        |
| Интерпретация | Не компилируется, строчка за строчкой | Ранний JS, Python       |
| **JIT**       | **Во время выполнения**               | **JS (V8), Java (JVM)** |

---

## Пайплайн V8 — шаг за шагом

```
Исходный JS-код
      │
      ▼
  Парсер → AST
      │
      ▼
  Ignition → Bytecode  ←── выполняется сразу
      │            │
      │     (профилирование: типы, частота вызовов)
      │            │
      ▼            ▼
  TurboFan (JIT) → Machine Code  ←── только для "горячего" кода
```

---

## Шаг 1 — Parsing (разбор)

1. **Лексический анализ** — исходный код разбивается на токены (`function`, `let`, `{`, и т.д.)
2. **Построение AST** — токены превращаются в дерево узлов:

- `FunctionDeclaration` → `BlockStatement` → `VariableDeclaration`, `ForStatement`, `BinaryExpression`...

3. **Scope Analysis** — V8 разрешает области видимости переменных, предотвращает утечки, обрабатывает hoisting

---

## Шаг 2 — Ignition: генерация байткода

**Bytecode** — компактное, платформо-независимое промежуточное представление (IR). Не машинный код — выполняется интерпретатором V8.

Пример байткода для функции `sumArray`:

```
LdaZero          ; Загрузить 0 в аккумулятор
Star sum         ; Сохранить в регистр 'sum'
LdaZero
Star i
Loop:
  Ldar i
  GetProperty length
  CompareLT
  JumpIfFalse Done
  GetElement       ; Загрузить arr[i]
  Add sum
  Star sum
  Inc i
  Jump Loop
Done:
  Ldar sum
  Return
```

**Зачем нужен байткод, а не сразу машинный код:**

- **Портативность** — работает на любой ОС/архитектуре с V8
- **Быстрый старт** — компиляция в байткод намного быстрее, чем сразу в машинный код
- **Стабильный IR** — удобная основа для TurboFan
- **Экономия памяти** — компактнее машинного кода

---

## Шаг 3 — Profiling (профилирование)

Пока Ignition интерпретирует байткод, V8 собирает данные:

- **Частота вызовов функций** — сколько раз вызвана функция
- **Type Feedback** — какие типы приходят в аргументы (`arr` — всегда `Array`?)
- **Inline Caches (IC)** — кэш для доступа к свойствам объектов:
  - **Monomorphic** — объект всегда одной формы → быстрый путь
  - **Polymorphic** — несколько разных форм → чуть медленнее
  - **Megamorphic** — очень много разных форм → IC бесполезен, медленно

Запуск **только** через Ignition (без JIT):

```bash
node --no-opt filename.js
```

---

## Шаг 4 — TurboFan: JIT-компиляция

Когда функция становится **«горячей»** (вызывается тысячи раз со стабильными типами), TurboFan компилирует её байткод в **нативный машинный код**.

### Оптимизации TurboFan

| Техника                        | Суть                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| **Type Specialization**        | Генерирует код для конкретных типов (`arr` = Array, `i` = integer) |
| **Loop-Invariant Code Motion** | Выносит `arr.length` за пределы цикла                              |
| **Bounds Check Elimination**   | Убирает проверки выхода за границы массива                         |
| **Inlining**                   | Встраивает вызовы функций напрямую                                 |
| **Constant Folding**           | Вычисляет константные выражения на этапе компиляции                |

### Пример результата — x86 ассемблер

```asm
xor rax, rax          ; sum = 0
xor rcx, rcx          ; i = 0
mov rdx, [rdi + 0x10] ; rdx = arr.length (один раз, вне цикла)
Loop:
  mov rbx, [rdi + 0x20 + rcx*8]  ; rbx = arr[i] (без bounds check)
  add rax, rbx
  inc rcx
  cmp rcx, rdx
  jl Loop
Done:
  ret
```

Прирост скорости: **~×10** по сравнению с интерпретацией.

```bash
# Посмотреть оптимизации и деоптимизации:
node --trace-opt --trace-deopt filename.js
```

---

## Шаг 5 — Deoptimization (деоптимизация)

TurboFan делает **спекулятивные предположения** о типах. Если они нарушаются — происходит деоптимизация.

### Причины

- **Несовпадение типов** — передали не массив в функцию, которая была оптимизирована под массив
- **Полиморфные вызовы** — объекты разных форм в одной функции

```js
sumArray({ length: 100 }); // Деоптимизация: ожидался Array
```

### Процесс деоптимизации

1. **Bailout** — машинный код обнаруживает нарушение предположений
2. **Откат** — выполнение возвращается в Ignition (байткод)
3. **Перекомпиляция** — TurboFan может перекомпилировать с более широкими type guards

Из реального лога `--trace-opt --trace-deopt`:

```
[marking sumArray for optimization to TURBOFAN, reason: hot and stable]
[completed optimizing sumArray]
[bailout (kind: deopt-eager, reason: not a Smi): deoptimizing sumArray]
[compiling sumArray again...]
```

---

## Шаг 6 — Hidden Classes и Inline Caches

Доступ к свойствам объектов — критически важная операция. V8 оптимизирует её через **hidden classes** (внутренние "формы" объектов) и **inline caches**.

### Три состояния IC

**Monomorphic** (быстрее всего) — один и тот же shape объекта:

```js
function getName(obj) {
  return obj.name;
}
const p1 = { name: "Alice", age: 25 }; // Hidden Class #1
const p2 = { name: "Bob", age: 30 }; // Hidden Class #1 (тот же shape)
getName(p1);
getName(p2); // → monomorphic, максимальная скорость
```

**Polymorphic** (умеренно) — несколько разных shapes (≤4):

```js
const person = { name: "Alice", age: 25 }; // Hidden Class #1
const animal = { name: "Rex", breed: "Dog" }; // Hidden Class #2
getName(person);
getName(animal); // → polymorphic, небольшое замедление
```

**Megamorphic** (медленно) — слишком много разных shapes (>4):

```js
// car, book, city, fruit, computer — 5 разных структур
// IC деградирует → generic lookup, значительное замедление
```

---

## Практические советы

- **Стабильные типы** — не смешивайте числа и строки в одном массиве
- **Одинаковая структура объектов** — V8 любит предсказуемые shapes; создавайте объекты с одинаковым набором полей
- **Не добавляйте свойства после создания** — это ломает hidden class и инвалидирует IC
- **Избегайте мегаморфных функций** — если функция принимает объекты очень разных форм, оптимизация невозможна

---

## Итоговая схема

```
JS-код → [Parser] → AST
                      ↓
               [Ignition] → Bytecode → (интерпретация + профилирование)
                                                    ↓
                                       функция "горячая"?
                                              Да ↓
                                   [TurboFan] → Machine Code  (~×10 быстрее)
                                         ↓
                                   тип изменился?
                                        Да ↓
                               Deoptimization → обратно в Ignition
```
