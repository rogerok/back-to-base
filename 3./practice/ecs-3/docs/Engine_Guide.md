# Engine в ECS: от концепций к реализации

## Часть 1. Зачем нужен Engine

### Проблема: кто всем управляет?

У тебя есть сущности, компоненты, системы, аспекты. Но кто-то должен:
- **Хранить** все сущности в одном месте
- **Хранить** все системы в одном месте
- **Запускать** системы каждый кадр
- **Быть точкой связи** между системами и сущностями

Без Engine ты бы писал так:

```ts
// Всё разбросано по глобальным переменным
const entities = new EntityCollection();
const systems = [new MovementSystem(), new GravitySystem(), new RenderingSystem()];

// Вручную передаёшь entities каждой системе
for (const system of systems) {
  system.setEntities(entities);  // как? у каждой системы свой интерфейс?
}

// Вручную вызываешь в цикле
function gameLoop(delta) {
  for (const system of systems) {
    system.process(delta);       // а порядок? а если система неактивна?
  }
}
```

Engine — это **центральный координатор**. Он берёт на себя всю эту
организационную работу.

### Аналогия: оркестр

- **Сущности** — ноты на листах
- **Компоненты** — конкретные параметры нот (высота, длительность)
- **Системы** — музыканты (каждый играет свою партию)
- **Engine** — дирижёр (говорит кому когда играть)

Дирижёр не играет сам. Он координирует. Так и Engine — он не обрабатывает
сущности, а организует работу систем.

---

## Часть 2. Что хранит Engine

У Engine ровно два поля и один метод:

```ts
class Engine {
  entities: EntityCollection;   // все сущности
  systems: SystemCollection;    // все системы

  run(delta: number): void;     // запустить один кадр
}
```

Вот и всё. Engine — простой класс. Его сложность не в нём самом,
а в том, как он **связывает** части вместе.

### Почему EntityCollection, а не массив?

```ts
// Можно было бы так:
entities: Entity[] = [];

// Но тогда нет событий. А Aspect подписывается на события:
// "когда добавили entity — проверь, подходит ли она"
```

`EntityCollection` — это `Collection<Entity>`, который наследует `Dispatcher`.
Когда ты делаешь `engine.entities.add(entity)`, Collection диспатчит
событие `onAdded`. Aspect слушает это событие и обновляет свой фильтр.

**Если бы entities был массивом** — Aspect не узнал бы о новых сущностях.
Пришлось бы вручную уведомлять Aspect после каждого `push()`. Collection
делает это автоматически.

### Почему SystemCollection?

По той же логике. Когда система добавляется в движок, нужно:
1. Вызвать `system.onAddedToEngine(engine)` — чтобы система узнала о движке
2. Отсортировать системы по приоритету — чтобы `run()` вызывал их в правильном порядке

SystemCollection — это Collection, который при добавлении системы
автоматически вызывает `onAddedToEngine`.

---

## Часть 3. Метод `run()` — сердце игрового цикла

Вот что происходит 60 раз в секунду:

```ts
// В index.ts:
function run() {
  requestAnimationFrame(() => {
    const now = Date.now();
    const delta = now - t;   // сколько мс прошло с прошлого кадра
    t = now;
    engine.run(delta);       // ← вот этот вызов
    run();
  });
}
```

`engine.run(delta)` должен пройтись по всем системам и вызвать `process`:

```ts
run(delta: number) {
  for (const system of this.systems.elements) {
    if (system.active) {
      system.process(delta);
    }
  }
}
```

Это всё, что делает `run()`. Проходит по системам (уже отсортированным
по приоритету) и вызывает `process(delta)` у каждой активной.

**Почему проверка `active`?**
Чтобы можно было "выключить" систему без удаления:
```ts
gravitySystem.active = false;  // гравитация отключена
// engine.run() пропустит GravitySystem
```

---

## Часть 4. SystemCollection — подписка на добавление систем

Обычная `Collection` просто хранит элементы. Но когда добавляется система,
нужно сделать две вещи:
1. Вызвать `system.onAddedToEngine(engine)` — инициализировать систему
2. Поддерживать порядок по приоритету

### Вариант 1: SystemCollection как подкласс Collection

```ts
class SystemCollection extends Collection<System> {
  constructor(private engine: Engine) {
    super();
  }
}
```

### Вариант 2: Engine подписывается на обычную Collection

Engine создаёт обычную `Collection<System>` и подписывается на `onAdded`:

```ts
class Engine {
  systems = new Collection<System>();

  constructor() {
    this.systems.addListener({
      onAdded: (...systems: System[]) => {
        for (const system of systems) {
          system.onAddedToEngine(this);
        }
      },
      onRemoved: (...systems: System[]) => {
        for (const system of systems) {
          system.onRemovedFromEngine(this);
        }
      },
    });
  }
}
```

**Какой вариант выбрать?**

Вариант 2 проще — не нужен новый класс. Это тот же паттерн Observer,
который ты уже используешь повсюду. Engine подписывается на коллекцию
систем точно так же, как Aspect подписывается на коллекцию сущностей.

---

## Часть 5. Связь Engine со всеми частями

Вот как Engine связывает всё вместе. Проследим полный путь:

```
1. const engine = new Engine();
   → создаёт EntityCollection
   → создаёт Collection<System> и подписывается на onAdded/onRemoved

2. engine.systems.add(new MovementSystem(0));
   → Collection.add() → dispatch("onAdded", movementSystem)
   → Engine получает событие → вызывает movementSystem.onAddedToEngine(engine)
   → MovementSystem (через AbstractEntitySystem) создаёт:
     → Aspect.for(engine).all(Position, Velocity)
     → Aspect подписывается на engine.entities (EntityCollection)
     → Aspect пока пуст — сущностей ещё нет

3. engine.entities.add(entityA);
   → EntityCollection.add() → dispatch("onAdded", entityA)
   → Aspect получает событие → trackEntity(entityA)
   → Aspect подписывается на entityA
   → Aspect проверяет: есть Position и Velocity? Да → добавляет в filteredEntities

4. engine.run(delta);   // каждый кадр
   → перебирает systems по порядку приоритета
   → movementSystem.process(delta)
     → перебирает aspect.entities (уже отфильтрованные!)
     → movementSystem.processEntity(entityA)
       → обновляет позицию
```

**Обрати внимание на цепочку:**
- Engine **не знает** об Aspect напрямую
- System **не знает** об EntityCollection напрямую
- Aspect **не знает** о System напрямую

Каждый знает только своих "соседей". Engine связывает их косвенно —
через ссылку на `engine.entities`, которую System передаёт в Aspect.

---

## Часть 6. Полная реализация Engine

```ts
import { Collection } from "./collection.ts";
import { Entity, EntityCollection } from "./entity.ts";
import { System } from "./system.ts";

export class Engine {
  entities: EntityCollection = new EntityCollection();
  systems: Collection<System> = new Collection<System>();

  constructor() {
    // Когда систему добавляют — инициализируем её
    this.systems.addListener({
      onAdded: (...systems: System[]) => {
        for (const system of systems) {
          system.onAddedToEngine(this);
        }
        // После добавления можно отсортировать по приоритету,
        // чтобы run() вызывал системы в правильном порядке
      },
      onRemoved: (...systems: System[]) => {
        for (const system of systems) {
          system.onRemovedFromEngine(this);
        }
      },
    });
  }

  // Запустить один кадр — вызывается из requestAnimationFrame
  run(delta: number) {
    for (const system of this.systems.elements) {
      if (system.active) {
        system.process(delta);
      }
    }
  }
}
```

### Разбор

**Почему подписка в конструкторе?**
Потому что Engine должен реагировать на добавление систем с самого начала.
Если подписаться позже — системы, добавленные до подписки, не получат
вызов `onAddedToEngine`.

**Почему `this` передаётся в `onAddedToEngine`?**
```ts
system.onAddedToEngine(this);
//                     ^^^^ — это Engine
```
Система получает ссылку на движок. Через неё она получит доступ к
`engine.entities` (для создания Aspect).

**Где сортировка по приоритету?**
В минимальной версии можно не сортировать — просто добавляй системы
в правильном порядке в `index.ts`. Но если хочешь сортировку:

```ts
onAdded: (...systems: System[]) => {
  for (const system of systems) {
    system.onAddedToEngine(this);
  }
  // Сортируем все системы по приоритету после добавления
  this.systems.elements.sort((a, b) => a.priority - b.priority);
},
```

---

## Часть 7. Что у тебя сейчас vs что нужно

Твой текущий Engine:

```ts
export class Engine {
  entities: EntityCollection;  // не инициализировано!
}
```

Проблемы:
1. `entities` не инициализировано — будет `undefined`
2. Нет `systems` — а в `index.ts` ты пишешь `engine.systems.add(...)`
3. Нет `run()` — а в `index.ts` ты пишешь `engine.run(delta)`
4. Нет подписки на systems — системы не получат `onAddedToEngine`

Всё это решается кодом из Части 6.

---

## Часть 8. Порядок реализации — что за чем

Вот рекомендуемый порядок, чтобы каждый шаг можно было проверить:

```
1. System (абстрактный класс)
   → можно проверить: создаётся ли new MovementSystem(0) без ошибок

2. AbstractEntitySystem (наследует System)
   → можно проверить: создаётся ли, принимает ли компоненты в конструкторе

3. Engine (с systems и entities)
   → можно проверить: engine.systems.add(system) вызывает onAddedToEngine?
   → engine.run(delta) вызывает process()?

4. Поправить импорты в системах
   → CollisionSystem и MovementSystem импортируют из "../system.ts"
   → Нужно поменять на "../lib/system.ts"

5. Запустить проект и проверить, что всё работает
```

---

## Часть 9. Диаграмма — Engine как центр

```
                         Engine
                     ┌────────────┐
                     │            │
          ┌──────────┤  entities  ├──────────┐
          │          │            │          │
          │          │  systems   │          │
          │          │            │          │
          │          │  run()     │          │
          │          └─────┬──────┘          │
          │                │                │
          ▼                ▼                ▼
  EntityCollection   Collection<System>   run() цикл
  ┌──────────┐      ┌──────────────┐    ┌─────────────┐
  │ Entity A │      │ Movement (0) │───>│ process()   │
  │ Entity B │      │ Resize   (0) │───>│ process()   │
  │ Entity C │      │ Gravity  (1) │───>│ process()   │
  │ ...      │      │ Collision(2) │───>│ process()   │
  └──────────┘      │ Renderer (3) │───>│ process()   │
       ▲            └──────────────┘    └─────────────┘
       │                   │
       │            onAddedToEngine()
       │                   │
       │                   ▼
       │              Aspect.for(engine)
       │                   │
       └───────────────────┘
              подписывается на
              engine.entities
```

Engine — простой класс. Его задача — дать системам доступ к сущностям
и вызывать `process()` каждый кадр. Вся сложная логика — в Aspect и System.
