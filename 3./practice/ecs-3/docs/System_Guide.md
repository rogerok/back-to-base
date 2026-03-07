# System в ECS: от концепций к реализации

## Часть 1. Зачем нужен System как абстракция

### Без System — хаос

Представь, что у тебя нет базового класса System. Каждая "система" — просто
функция или произвольный объект:

```ts
function moveEntities(engine, delta) { ... }
function renderEntities(engine, delta) { ... }
function handleGravity(engine, delta) { ... }

// В игровом цикле — вызываешь вручную, в нужном порядке
function gameLoop(delta) {
  moveEntities(engine, delta);
  handleGravity(engine, delta);
  renderEntities(engine, delta);
}
```

Проблемы:
- **Порядок вызова зашит в коде** — чтобы поменять порядок, надо менять `gameLoop`
- **Нельзя динамически добавлять/убирать системы** — всё захардкожено
- **Системы не знают о движке** — каждой надо вручную передавать `engine`
- **Нет общего интерфейса** — каждая система может выглядеть как угодно

### С System — порядок

System — это **контракт**. Он говорит: "Любая система — это объект, у которого
есть метод `process(delta)`. Движок знает, как вызывать системы. Системы знают,
как получить доступ к движку."

```ts
// Движок сам управляет системами
engine.systems.add(new MovementSystem(0));    // приоритет 0
engine.systems.add(new GravitySystem(1));     // приоритет 1
engine.systems.add(new RenderingSystem(3));   // приоритет 3

// В игровом цикле — одна строка
engine.run(delta);  // движок сам вызовет все системы в правильном порядке
```

---

## Часть 2. Два типа систем — зачем два класса

Посмотри на свои системы. Они делятся на два вида:

### Вид 1: "Я сам решу, что делать" — System

`RenderingSystem` и `ResizeSystem` — это системы, которые сами создают
Aspect и сами решают, как обрабатывать сущности:

```ts
class RenderingSystem extends System {
  onAddedToEngine(engine: Engine) {
    // Сам создаю Aspect с нужным фильтром
    this.aspect = Aspect.for(engine).all(Position, Size);
  }

  process(delta: number) {
    // Сам решаю, как использовать отфильтрованные сущности
    this.graphics.clear();
    for (const entity of this.aspect.entities) {
      // своя сложная логика рисования
    }
    this.pixiApp.render();
  }
}
```

RenderingSystem не просто "обрабатывает каждую сущность". Он очищает экран,
настраивает графику, рисует все сущности разом, а потом вызывает render.
Ему нужен полный контроль.

### Вид 2: "Просто дай мне каждую сущность по очереди" — AbstractEntitySystem

`MovementSystem`, `GravitySystem`, `CollisionSystem` — у них одинаковая
структура:

```ts
// Все три делают одно и то же:
// 1. Отфильтровать сущности по компонентам
// 2. Пройтись по каждой
// 3. Сделать что-то с одной сущностью

class MovementSystem {
  process() {
    for (const entity of отфильтрованные) {
      // логика для ОДНОЙ entity
      position.x += velocity.x;
    }
  }
}

class GravitySystem {
  process() {
    for (const entity of отфильтрованные) {
      // логика для ОДНОЙ entity
      velocity.y += gravity;
    }
  }
}
```

Отличается только логика внутри цикла. Сам цикл и фильтрация — копипаста.
`AbstractEntitySystem` убирает эту копипасту:

```ts
class MovementSystem extends AbstractEntitySystem<MyEntity> {
  constructor() {
    super(0, [Position, Velocity]);  // фильтр задаётся здесь
  }

  // Реализуешь только логику для ОДНОЙ entity
  processEntity(entity: MyEntity) {
    const pos = entity.components.get(Position);
    const vel = entity.components.get(Velocity);
    pos.x += vel.x;
    pos.y += vel.y;
  }
}
```

Никаких циклов, никакой фильтрации — `AbstractEntitySystem` делает это
за тебя.

### Отношение между ними

```
System (абстрактный)
  │
  ├── используется напрямую: RenderingSystem, ResizeSystem
  │   (полный контроль над process())
  │
  └── AbstractEntitySystem (абстрактный, наследует System)
        │
        ├── MovementSystem    (только processEntity)
        ├── GravitySystem     (только processEntity)
        └── CollisionSystem   (только processEntity)
```

`AbstractEntitySystem` — это `System` + автоматический Aspect + цикл по сущностям.

---

## Часть 3. Жизненный цикл системы

У системы есть чёткий жизненный цикл — последовательность событий от
создания до работы:

```
1. СОЗДАНИЕ
   new MovementSystem(0)
   → Система создана, но она "мёртвая" — не привязана к движку,
     не знает о сущностях

2. ДОБАВЛЕНИЕ В ДВИЖОК
   engine.systems.add(system)
   → Движок вызывает system.onAddedToEngine(engine)
   → Система получает ссылку на движок
   → Система может создать Aspect, получить доступ к canvas и т.д.
   → С этого момента система "живая"

3. РАБОТА (каждый кадр)
   engine.run(delta)
   → Движок вызывает system.process(delta) для каждой системы
   → Система делает свою работу

4. УДАЛЕНИЕ (опционально)
   engine.systems.remove(system)
   → Движок вызывает system.onRemovedFromEngine(engine)
   → Система "умирает"
```

### Почему нельзя создать Aspect в конструкторе?

```ts
class MovementSystem extends System {
  constructor() {
    super(0);
    // НЕЛЬЗЯ: this.aspect = Aspect.for(engine).all(Position, Velocity);
    // Потому что engine ещё не известен! Систему ещё не добавили в движок.
  }
}
```

На момент `new MovementSystem()` движка ещё нет. Система — это просто
объект с настройками. Движок появляется только когда вызывается
`onAddedToEngine(engine)`:

```ts
onAddedToEngine(engine: Engine) {
  // Вот теперь engine доступен — можно создавать Aspect
  this.aspect = Aspect.for(engine).all(Position, Velocity);
}
```

Это классический паттерн **двухфазная инициализация**:
- Фаза 1 (конструктор): создаём объект, задаём настройки
- Фаза 2 (onAddedToEngine): инициализируем всё, что зависит от окружения

---

## Часть 4. Приоритеты — зачем и как

В `index.ts` системы добавляются с приоритетами:

```ts
engine.systems.add(new MovementSystem(0));     // приоритет 0 — первый
engine.systems.add(new ResizeSystem(0));        // приоритет 0
engine.systems.add(new GravitySystem(0.25, 1)); // приоритет 1
engine.systems.add(new CollisionSystem(2));     // приоритет 2
engine.systems.add(new RenderingSystem(3));     // приоритет 3 — последний
```

**Порядок важен!** Представь, что рендеринг произойдёт ДО перемещения:
- Сущность нарисована на позиции (10, 20)
- Потом позиция обновляется до (11, 20)
- На экране — устаревшая картинка, отставание на 1 кадр

Правильный порядок:
1. Движение (обновить позиции)
2. Гравитация (применить силы)
3. Коллизии (скорректировать позиции)
4. Рендеринг (нарисовать актуальное состояние)

Приоритет — это число. Чем меньше число, тем раньше система выполнится.
Движок сортирует системы по приоритету перед выполнением.

---

## Часть 5. Реализация System

### Что хранит System

```ts
abstract class System {
  engine?: Engine;    // ссылка на движок (появляется после onAddedToEngine)
  aspect?: Aspect;    // фильтр сущностей (создаётся в onAddedToEngine)
  priority: number;   // порядок выполнения
  active: boolean;    // можно "выключить" систему без удаления
}
```

### Полный код

```ts
import { Aspect } from "./aspect.ts";
import { Engine } from "./engine.ts";

export abstract class System {
  engine?: Engine;
  aspect?: Aspect;
  active: boolean = true;

  constructor(public priority: number = 0) {}

  // Вызывается движком при engine.systems.add(system)
  onAddedToEngine(engine: Engine) {
    this.engine = engine;
  }

  // Вызывается движком при engine.systems.remove(system)
  onRemovedFromEngine(engine: Engine) {
    this.engine = undefined;
  }

  // Каждый кадр — движок вызывает этот метод
  abstract process(delta: number): void;
}
```

**Почему `engine` — опциональное?**
Потому что между `new System()` и `engine.systems.add(system)` проходит время.
В этот промежуток `engine` ещё не задан. TypeScript `?` отражает эту реальность.

**Зачем `active`?**
Иногда нужно временно отключить систему (например, пауза). Вместо того чтобы
удалять систему из движка и добавлять обратно, можно просто сказать
`system.active = false`. Движок проверит это поле и пропустит систему.

---

## Часть 6. Реализация AbstractEntitySystem

AbstractEntitySystem автоматизирует паттерн "отфильтруй сущности и обработай
каждую":

```ts
import { Aspect } from "./aspect.ts";
import { ComponentClass } from "./types.ts";
import { Component } from "./component.ts";
import { Engine } from "./engine.ts";
import { Entity } from "./entity.ts";
import { System } from "./system.ts";

type CompType = ComponentClass<Component>;

export abstract class AbstractEntitySystem<E extends Entity = Entity> extends System {
  constructor(
    priority?: number,
    private componentTypes: CompType[] = [],
  ) {
    super(priority);
  }

  // При добавлении в движок — автоматически создаём Aspect
  onAddedToEngine(engine: Engine) {
    super.onAddedToEngine(engine);
    this.aspect = Aspect.for(engine).all(...this.componentTypes);
  }

  // process() уже реализован — он итерирует и вызывает processEntity
  process(delta: number) {
    for (const entity of this.aspect!.entities) {
      this.processEntity(entity as E, delta);
    }
  }

  // Подкласс реализует только это — логику для ОДНОЙ сущности
  abstract processEntity(entity: E, delta?: number): void;
}
```

### Разбор по частям

**Зачем дженерик `<E extends Entity>`?**

Твои системы работают не с абстрактным `Entity`, а с конкретным `MyEntity`:

```ts
class MovementSystem extends AbstractEntitySystem<MyEntity> {
  processEntity(entity: MyEntity) {  // ← тип MyEntity, не Entity
    // TypeScript знает, что это MyEntity
  }
}
```

Без дженерика пришлось бы кастовать:
```ts
processEntity(entity: Entity) {
  const myEntity = entity as MyEntity;  // некрасиво
}
```

**Зачем `super.onAddedToEngine(engine)`?**

Посмотри на `GravitySystem`:

```ts
class GravitySystem extends AbstractEntitySystem<MyEntity> {
  onAddedToEngine(engine: Engine) {
    super.onAddedToEngine(engine);  // ← вызывает AbstractEntitySystem.onAddedToEngine
    // который вызывает System.onAddedToEngine (устанавливает this.engine)
    // и создаёт Aspect

    this.canvas = document.getElementById("canvas");  // своя доп. инициализация
  }
}
```

Цепочка вызовов:
```
GravitySystem.onAddedToEngine(engine)
  → super → AbstractEntitySystem.onAddedToEngine(engine)
    → super → System.onAddedToEngine(engine)
      → this.engine = engine          // шаг 1: запоминаем движок
    → this.aspect = Aspect.for(...)   // шаг 2: создаём фильтр
  → this.canvas = ...                 // шаг 3: своя логика
```

Если забыть `super.onAddedToEngine(engine)` — не будет ни `this.engine`,
ни `this.aspect`. Система сломается.

**Зачем `this.aspect!` с восклицательным знаком?**

```ts
process(delta: number) {
  for (const entity of this.aspect!.entities) {
```

`aspect` объявлен как `Aspect | undefined` (в System). TypeScript не знает,
что к моменту вызова `process()` aspect уже точно создан (в onAddedToEngine).
`!` говорит TypeScript: "я уверен, что здесь не undefined". Это безопасно,
потому что движок вызывает `onAddedToEngine` ДО первого `process`.

**Зачем `entity as E`?**

`this.aspect.entities` возвращает `Entity[]`, а `processEntity` ожидает `E`
(например, `MyEntity`). Каст `as E` нужен для TypeScript — мы знаем, что
в движке только `MyEntity`, но компилятор этого не знает.

---

## Часть 7. Как System и Aspect взаимодействуют

```
  System                              Aspect
  ┌──────────────────┐               ┌─────────────────────┐
  │ onAddedToEngine() │──создаёт──>  │ source: engine.     │
  │                   │              │         entities     │
  │                   │              │                      │
  │ process(delta):   │              │ filteredEntities:    │
  │   for entity of ──│──читает───>  │   [entityA,          │
  │     aspect.       │              │    entityC,          │
  │     entities      │              │    entityE]          │
  └──────────────────┘               └─────────────────────┘
         │                                    ▲
         │                                    │ обновляется
         │                                    │ автоматически
         │                                    │ (через подписки)
    НЕ управляет                         EntityCollection
    фильтрацией!                       добавляет/удаляет
```

System **создаёт** Aspect один раз и потом просто **читает** его результат.
System не вызывает checkEntity, не управляет подписками — это всё внутри
Aspect. System — потребитель, Aspect — поставщик.

---

## Часть 8. Полная картина — что куда кладёт

Создай файл `lib/system.ts` и экспортируй из него оба класса:

```ts
// lib/system.ts

export abstract class System { ... }
export abstract class AbstractEntitySystem<E extends Entity> extends System { ... }
```

Твои системы импортируют так:
- `GravitySystem` → `import { AbstractEntitySystem } from "../lib/system.ts"`
- `RenderingSystem` → `import { System } from "../lib/system.ts"`
- `CollisionSystem` → сейчас `import from "../system.ts"` — нужно поправить на `"../lib/system.ts"`
- `MovementSystem` → аналогично
