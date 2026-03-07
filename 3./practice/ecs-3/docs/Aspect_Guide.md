# Aspect в ECS: от концепций к реализации

## Часть 1. Две модели получения данных: Pull vs Push

В программировании есть два фундаментально разных способа узнать о том, что что-то произошло.

### Pull (вытягивание) — ты спрашиваешь сам

Ты сам, когда тебе нужно, идёшь и проверяешь состояние:

```ts
// Каждый кадр (60 раз в секунду) перебираем ВСЕ сущности
function update() {
  for (const entity of allEntities) {           // 1000 сущностей
    if (hasComponent(entity, Position) &&        // проверка
        hasComponent(entity, Velocity)) {        // ещё проверка
      // обработать — но сюда попадут только 300
    }
  }
}
```

Это как если бы ты каждую минуту открывал почтовый ящик, чтобы проверить,
есть ли новое письмо. Даже если писем нет — ты всё равно ходишь и проверяешь.

**Проблема:** 700 из 1000 проверок — впустую. И это происходит 60 раз в секунду.
Работает, но расточительно.

### Push (проталкивание) — тебе сообщают сами

Вместо того чтобы постоянно проверять, ты говоришь:
"Когда появится что-то интересное — скажите мне". И спокойно занимаешься своими делами.

```ts
// Один раз настроил — и забыл
entityCollection.addListener({
  onAdded: (entity) => {
    // Меня уведомят только когда реально что-то добавится
    if (hasAllComponents(entity)) {
      filteredList.push(entity);
    }
  }
});

// В игровом цикле просто используем готовый список
function update() {
  for (const entity of filteredList) {  // сразу только 300 нужных
    // обработать
  }
}
```

Это как подписка на уведомления — письмо пришло, телефон звякнул, ты прочитал.
Не нужно каждую минуту бежать к ящику.

### Почему это важно для Aspect

**Aspect — это Push-модель.** Он не "ищет" нужные сущности каждый кадр.
Он один раз подписывается на события и потом **реагирует** на изменения.
Результат — всегда актуальный отфильтрованный список, без лишней работы.

---

## Часть 2. Паттерн Observer — фундамент всего

Прежде чем разбирать Aspect, нужно убедиться, что ты понимаешь паттерн,
на котором строится вся эта библиотека.

### Суть паттерна

**Observer (Наблюдатель)** — это способ организовать Push-модель.
У него две роли:

- **Subject (Издатель)** — тот, у кого происходят события. Он хранит список
  подписчиков и уведомляет их, когда что-то случается.
- **Observer (Наблюдатель/Подписчик)** — тот, кто хочет знать о событиях.
  Он регистрируется у Издателя и получает вызовы.

### Как это работает в твоём коде

В твоей библиотеке Subject — это `Dispatcher`. Посмотри на него:

```ts
abstract class Dispatcher<T> {
  listeners = new Set<Partial<T>>();     // список подписчиков

  addListener(listener: Partial<T>) {    // подписаться
    this.listeners.add(listener);
  }

  dispatch(name, ...args) {              // уведомить всех
    this.listeners.forEach(listener => {
      const fn = listener[name];
      if (typeof fn === "function") fn.apply(listener, ...args);
    });
  }
}
```

Кто является Издателем (наследует Dispatcher)?
- `Collection` — сообщает: "в меня добавили/удалили элемент"
- `Entity` — сообщает: "мне добавили/удалили компонент"
- `Aspect` — сообщает: "сущность прошла/не прошла фильтр"

### Цепочка подписок — ключ к пониманию

Вот что делает эту библиотеку интересной. Подписчики **подписываются
друг на друга**, создавая цепочку реакций:

```
ComponentCollection (Dispatcher)
  └── Entity подписан на свою ComponentCollection
        "когда мне добавят компонент — я оповещу своих подписчиков"

Entity (Dispatcher)
  └── Aspect подписан на каждую Entity
        "когда у entity изменятся компоненты — я перепроверю фильтр"

EntityCollection (Dispatcher)
  └── Aspect подписан на EntityCollection движка
        "когда появится новая entity — я начну за ней следить"
```

Это **цепочка событий**. Когда ты пишешь `entity.components.add(new Velocity())`:

1. `ComponentCollection.addMany()` вызывает `this.dispatch("onAdded", velocity)`
2. `Entity` — подписчик `ComponentCollection` — получает `onAdded`
3. `Entity.onAdded()` вызывает `this.dispatch("onAddedComponents", velocity)`
4. `Aspect` — подписчик `Entity` — получает `onAddedComponents`
5. `Aspect` перепроверяет: подходит ли теперь эта entity?

**Одно действие** (`components.add`) запускает **каскад реакций** через три
уровня подписок. Никто никого не опрашивает — информация сама течёт вниз.

### Зачем промежуточный уровень Entity?

Можно было бы подписать Aspect напрямую на `ComponentCollection` каждой
сущности. Но `Entity` выступает как **посредник** (медиатор):

- `ComponentCollection` знает только про компоненты — не про сущности
- `Entity` оборачивает событие, добавляя контекст: "ЭТО У МЕНЯ добавился компонент"
- `Aspect` получает и сущность, и компонент — может принять решение

Без Entity:
```ts
// Aspect подписан на ComponentCollection
onAdded(component) {
  // А какой entity принадлежит эта коллекция?? Непонятно!
}
```

С Entity:
```ts
// Aspect подписан на Entity
onAddedComponents(entity, component) {
  // Чётко: у ЭТОЙ entity добавился ЭТОТ компонент
  this.checkEntity(entity);
}
```

---

## Часть 3. Что такое Aspect — концептуально

Теперь ты понимаешь Observer и Push-модель. Давай точно определим, что такое
Aspect.

### Аналогия: SQL VIEW

Если ты знаком с базами данных — Aspect похож на VIEW:

```sql
-- Все сущности — это таблица
-- Aspect — это VIEW с фильтром

CREATE VIEW movable_entities AS
  SELECT * FROM entities
  WHERE has_component('Position')
    AND has_component('Velocity');
```

VIEW не хранит данные отдельно — он автоматически отражает актуальное
состояние таблицы. Добавил строку в `entities` — если она подходит под
фильтр, она сразу видна во VIEW.

Aspect работает так же — это **"живой запрос"** к коллекции сущностей.

### Три роли Aspect

1. **Фильтр** — знает, какие компоненты нужны
   (`all(Position, Velocity)` — нужны ОБА)

2. **Кэш** — хранит результат фильтрации, чтобы не пересчитывать
   каждый кадр

3. **Подписчик** — слушает изменения и обновляет кэш автоматически

### Жизненный цикл Aspect

```
1. СОЗДАНИЕ
   Aspect.for(engine)
   → Aspect подписывается на engine.entities (EntityCollection)
   → "Скажи мне, когда добавишь или удалишь сущность"

2. НАСТРОЙКА ФИЛЬТРА
   .all(Position, Velocity)
   → Aspect запоминает: "мне нужны сущности, у которых есть Position И Velocity"
   → Проходит по уже существующим сущностям, проверяет каждую
   → Подходящие добавляет в свой внутренний список

3. ЖИЗНЬ (игровой цикл крутится)
   → Кто-то добавил entity в движок → Aspect получает событие →
     подписывается на эту entity + проверяет фильтр
   → Кто-то добавил компонент к entity → Aspect получает событие →
     перепроверяет фильтр (может, теперь подходит?)
   → Кто-то удалил компонент → Aspect получает событие →
     перепроверяет (может, больше не подходит?)

4. ИСПОЛЬЗОВАНИЕ
   system.process() {
     for (const entity of this.aspect.entities) {
       // Тут гарантированно только подходящие сущности.
       // Никаких проверок не нужно.
     }
   }
```

---

## Часть 4. Архитектура данных Aspect

Прежде чем писать код, нужно понять, что Aspect хранит.

### Два списка: "источник" и "результат"

```
  source (EntityCollection)          filteredEntities (Entity[])
  ┌───────────────────────┐          ┌──────────────────┐
  │ Entity A [Pos, Vel]   │ ──────>  │ Entity A         │
  │ Entity B [Pos]        │    ✗     │                  │
  │ Entity C [Pos, Vel]   │ ──────>  │ Entity C         │
  │ Entity D [Size]       │    ✗     │                  │
  │ Entity E [Pos, Vel]   │ ──────>  │ Entity E         │
  └───────────────────────┘          └──────────────────┘
         ВСЕ сущности                  aspect.all(Pos, Vel)
         в движке                      только подходящие
```

- **source** — ссылка на `engine.entities`. Aspect не владеет этим списком,
  а лишь наблюдает за ним.
- **filteredEntities** — собственный список Aspect. Это кэш результата
  фильтрации. Системы читают именно его через `this.aspect.entities`.

### Карта подписок: entityListeners

Aspect подписывается на каждую сущность из source. Но если сущность удалят
из движка — нужно отписаться, иначе будет утечка памяти (Aspect будет
вечно следить за мёртвой сущностью).

Для этого нужно помнить, какой листенер мы создали для какой сущности:

```ts
private entityListeners = new Map<Entity, listener>();
//      ↑ ключ                     ↑ значение
//      сущность                   объект-подписчик, который мы передали
//                                 в entity.addListener(...)
```

Когда entity удаляется — достаём листенер из Map и вызываем
`entity.removeListener(listener)`. Чисто и аккуратно.

**Почему нельзя просто забыть про отписку?** Потому что:
1. Мёртвая entity останется в памяти (листенер держит ссылку)
2. Если её компоненты изменятся извне — Aspect будет пытаться
   добавить её в filteredEntities, хотя её нет в движке

---

## Часть 5. Пошаговая реализация с объяснениями

Теперь, когда концепции понятны, пишем код. Каждый блок объясняет
не только "что", но и "зачем".

### Шаг 1: Скелет класса

```ts
type CompType = ComponentClass<Component>;

export class Aspect extends Dispatcher<AspectListener> {
  // Результат фильтрации — то, что увидят системы
  filteredEntities: Entity[] = [];

  // Критерий фильтра — какие классы компонентов нужны
  allComponents: CompType[] = [];

  // Источник данных — все сущности движка
  private source: EntityCollection;

  // Реестр подписок — чтобы уметь отписываться
  private entityListeners = new Map<Entity, object>();
}
```

**Зачем `filteredEntities` — простой массив, а не Collection?**
Потому что системам не нужны события о фильтрации. Им нужен просто
список для итерации. Collection добавил бы лишнюю сложность.

**Зачем `source` — приватное поле?**
Снаружи никто не должен менять источник. Aspect привязывается к одному
EntityCollection при создании и работает с ним всю жизнь.

### Шаг 2: Конструктор — подписка на EntityCollection

```ts
constructor(source: EntityCollection) {
  super();
  this.source = source;

  // Главная идея: мы подписываемся на ВСЕ изменения в коллекции
  // сущностей движка. Это одноразовое действие — дальше Aspect
  // будет получать уведомления автоматически.
  source.addListener({
    onAdded: (...entities: Entity[]) => {
      for (const e of entities) this.trackEntity(e);
    },
    onRemoved: (...entities: Entity[]) => {
      for (const e of entities) this.untrackEntity(e);
    },
    onCleared: () => {
      this.filteredEntities = [];
      this.entityListeners.clear();
    },
  });
}
```

**Почему подписка в конструкторе?**
Потому что Aspect должен реагировать на ВСЕ изменения с момента своего
создания. Если подписаться позже — можно пропустить сущности, которые
добавили между созданием Aspect и подпиской.

**Что такое `trackEntity` / `untrackEntity`?**
Это два внутренних метода (напишем ниже), которые означают:
- `trackEntity` — "начни следить за этой сущностью"
- `untrackEntity` — "перестань следить за этой сущностью"

**Зачем обработчик `onCleared`?**
Если кто-то вызовет `engine.entities.clear()` (удалит все сущности разом),
нужно полностью сбросить состояние Aspect. Иначе filteredEntities будет
содержать ссылки на несуществующие сущности.

### Шаг 3: Статический метод `for` и метод `all`

```ts
// Фабричный метод — удобный способ создания.
// Вместо `new Aspect(engine.entities)` пишем `Aspect.for(engine)`
static for(engine: Engine): Aspect {
  return new Aspect(engine.entities);
}

// Настройка фильтра.
// Вызов: Aspect.for(engine).all(Position, Velocity)
all(...components: CompType[]): this {
  this.allComponents = [...new Set(components)]; // Set убирает дубли

  // ВАЖНО: на момент вызова all() в движке уже могут быть сущности!
  // Пример:
  //   engine.entities.add(entityA, entityB);  // сначала добавили
  //   Aspect.for(engine).all(Position);       // потом создали Aspect
  //
  // Если не просканировать существующие сущности — entityA и entityB
  // не попадут в filteredEntities, хотя могут подходить под фильтр.
  this.filteredEntities = [];
  for (const entity of this.source.elements) {
    this.trackEntity(entity);
  }

  return this; // возвращаем this для chaining: .all(A).exclude(B)
}
```

**Что такое chaining (цепочка вызовов)?**
Когда метод возвращает `this`, можно вызывать методы подряд:
```ts
Aspect.for(engine).all(Position).exclude(Dead)
//     ↑ возвращает Aspect    ↑ возвращает this    ↑ возвращает this
```
Каждый метод настраивает аспект и возвращает его же — удобный паттерн
для builder-подобных API.

**Зачем `new Set(components)`?**
Защита от дубликатов. Если кто-то напишет `.all(Position, Position)`,
Set уберёт повторение. Без этого `matchesAll` проверял бы Position
дважды — не ошибка, но бессмысленная работа.

### Шаг 4: Метод проверки — matchesAll

```ts
private matchesAll(entity: Entity): boolean {
  // Проверяем: есть ли у entity ВСЕ компоненты из списка allComponents?
  //
  // allComponents = [Position, Velocity]
  // entity имеет [Position, Velocity, Size]
  // → Position есть? Да. Velocity есть? Да. → true
  //
  // entity имеет [Position, Size]
  // → Position есть? Да. Velocity есть? Нет. → false (every прерывается)
  return this.allComponents.every(
    cls => entity.components.getAll(cls).length > 0
  );
}
```

**Почему `getAll(cls).length > 0`, а не `get(cls) !== undefined`?**
В твоей реализации `ComponentCollection.get()` типизирован как
возвращающий `T`, а не `T | undefined`. TypeScript не предупредит,
если компонента нет — `get()` молча вернёт `undefined`, но тип скажет,
что это `T`. Проверка через `getAll().length` точнее и безопаснее.

**Почему метод `private`?**
Это внутренняя механика Aspect. Системы не должны вызывать `matchesAll`
напрямую — они просто читают `aspect.entities`.

### Шаг 5: trackEntity — начать следить за сущностью

```ts
private trackEntity(entity: Entity) {
  // Если мы ещё не следим за этой entity — подписываемся
  if (!this.entityListeners.has(entity)) {
    // Создаём объект-листенер для этой конкретной entity.
    // Через замыкание он "помнит", за какой entity следит.
    const listener = {
      onAddedComponents: () => this.checkEntity(entity),
      onRemovedComponents: () => this.checkEntity(entity),
    };

    // Подписываемся на entity — теперь когда у неё изменятся
    // компоненты, нас уведомят
    entity.addListener(listener);

    // Сохраняем листенер в Map, чтобы потом отписаться
    this.entityListeners.set(entity, listener);
  }

  // Сразу проверяем — может, entity уже подходит
  this.checkEntity(entity);
}
```

**Почему проверка `if (!this.entityListeners.has(entity))`?**
Защита от двойной подписки. `trackEntity` вызывается из двух мест:
1. Когда entity добавляется в движок (событие `onAdded`)
2. Когда вызывается `all()` и мы сканируем существующие сущности

Без проверки — если entity уже в движке и мы вызовем `all()`,
мы подпишемся на неё второй раз. Каждое изменение компонентов
будет обрабатываться дважды.

**Что такое замыкание (closure) здесь?**
```ts
const listener = {
  onAddedComponents: () => this.checkEntity(entity),
  //                                        ^^^^^^
  //                           эта переменная "захвачена" из внешней функции
};
```
Стрелочная функция "захватывает" переменную `entity` из scope функции
`trackEntity`. Даже когда `trackEntity` завершится — функция внутри
listener будет помнить, какой entity она принадлежит.

Это позволяет создать уникальный листенер для каждой entity без
создания отдельного класса.

### Шаг 6: untrackEntity — прекратить следить

```ts
private untrackEntity(entity: Entity) {
  // Убираем из отфильтрованного списка (если была там)
  const idx = this.filteredEntities.indexOf(entity);
  if (idx !== -1) this.filteredEntities.splice(idx, 1);

  // Отписываемся от событий entity
  const listener = this.entityListeners.get(entity);
  if (listener) {
    entity.removeListener(listener);    // отписка
    this.entityListeners.delete(entity); // удаляем из реестра
  }
}
```

**Зачем отписываться?**
Если entity удалили из движка, но Aspect остался подписан на неё:
1. **Утечка памяти** — сборщик мусора не удалит entity, потому что
   на неё есть ссылка из listener
2. **Призрачные сущности** — если кто-то продолжит менять компоненты
   этой entity, Aspect будет реагировать и может добавить её обратно
   в filteredEntities, хотя в движке её уже нет

### Шаг 7: checkEntity — сердце Aspect

```ts
private checkEntity(entity: Entity) {
  const matches = this.matchesAll(entity);
  const idx = this.filteredEntities.indexOf(entity);
  const alreadyIn = idx !== -1;

  if (matches && !alreadyIn) {
    // Случай 1: entity ПОДХОДИТ, но её НЕТ в списке → добавляем
    // Это происходит когда:
    //   - новая entity сразу имеет нужные компоненты
    //   - entity добавили недостающий компонент
    this.filteredEntities.push(entity);

  } else if (!matches && alreadyIn) {
    // Случай 2: entity НЕ ПОДХОДИТ, но она ЕСТЬ в списке → убираем
    // Это происходит когда:
    //   - у entity удалили один из нужных компонентов
    this.filteredEntities.splice(idx, 1);
  }

  // Случай 3: matches && alreadyIn → уже в списке, ничего не делаем
  // Случай 4: !matches && !alreadyIn → не подходит и не в списке, ок
}
```

**Почему именно 4 случая?**
Это **матрица состояний** — два булевых значения дают 4 комбинации:

```
                 │ alreadyIn = true │ alreadyIn = false
─────────────────┼──────────────────┼───────────────────
matches = true   │ ничего не делать │ ДОБАВИТЬ
matches = false  │ УБРАТЬ           │ ничего не делать
```

Только два из четырёх случаев требуют действий. Это делает checkEntity
**идемпотентным** — его можно вызвать сколько угодно раз, и результат
будет правильным. Нет опасности добавить entity дважды или удалить
несуществующую.

### Шаг 8: Геттер entities

```ts
get entities(): Entity[] {
  return this.filteredEntities;
}
```

Это для совместимости с API библиотеки. В системах пишут
`this.aspect.entities` — геттер возвращает отфильтрованный список.

---

## Часть 6. Полная минимальная реализация

Собирая всё вместе:

```ts
import { ComponentClass } from "../types.ts";
import { Component } from "./component.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Engine } from "./engine.ts";
import { Entity, EntityCollection, EntityListener } from "./entity.ts";

type CompType = ComponentClass<Component>;

export interface AspectListener {
  onAddedEntities?: (...entities: Entity[]) => void;
  onRemovedEntities?: (...entities: Entity[]) => void;
}

export class Aspect extends Dispatcher<AspectListener> {
  filteredEntities: Entity[] = [];
  allComponents: CompType[] = [];
  private source: EntityCollection;
  private entityListeners = new Map<Entity, Partial<EntityListener>>();

  constructor(source: EntityCollection) {
    super();
    this.source = source;

    source.addListener({
      onAdded: (...entities: Entity[]) => {
        for (const e of entities) this.trackEntity(e);
      },
      onRemoved: (...entities: Entity[]) => {
        for (const e of entities) this.untrackEntity(e);
      },
      onCleared: () => {
        this.filteredEntities = [];
        this.entityListeners.clear();
      },
    });
  }

  get entities(): Entity[] {
    return this.filteredEntities;
  }

  static for(engine: Engine): Aspect {
    return new Aspect(engine.entities);
  }

  all(...components: CompType[]): this {
    this.allComponents = [...new Set(components)];
    this.filteredEntities = [];
    for (const entity of this.source.elements) {
      this.trackEntity(entity);
    }
    return this;
  }

  private matchesAll(entity: Entity): boolean {
    return this.allComponents.every(
      cls => entity.components.getAll(cls).length > 0
    );
  }

  private trackEntity(entity: Entity) {
    if (!this.entityListeners.has(entity)) {
      const listener = {
        onAddedComponents: () => this.checkEntity(entity),
        onRemovedComponents: () => this.checkEntity(entity),
      };
      entity.addListener(listener);
      this.entityListeners.set(entity, listener);
    }
    this.checkEntity(entity);
  }

  private untrackEntity(entity: Entity) {
    const idx = this.filteredEntities.indexOf(entity);
    if (idx !== -1) this.filteredEntities.splice(idx, 1);

    const listener = this.entityListeners.get(entity);
    if (listener) {
      entity.removeListener(listener);
      this.entityListeners.delete(entity);
    }
  }

  private checkEntity(entity: Entity) {
    const matches = this.matchesAll(entity);
    const idx = this.filteredEntities.indexOf(entity);
    const alreadyIn = idx !== -1;

    if (matches && !alreadyIn) {
      this.filteredEntities.push(entity);
    } else if (!matches && alreadyIn) {
      this.filteredEntities.splice(idx, 1);
    }
  }
}
```

---

## Часть 7. Как всё работает вместе — полный пример

Давай проследим, что происходит пошагово в реальном сценарии.

### Сценарий: создание игры

```ts
// 1. Создаём движок
const engine = new Engine();
// engine.entities — пустая EntityCollection

// 2. Создаём Aspect
const aspect = Aspect.for(engine).all(Position, Velocity);
// Что произошло:
//   - new Aspect(engine.entities) → подписались на EntityCollection
//   - .all(Position, Velocity) → запомнили фильтр
//   - просканировали engine.entities → пусто, filteredEntities = []

// 3. Создаём сущность с компонентами
const entity = new MyEntity();
entity.components.add(new Position(10, 20));
entity.components.add(new Velocity(1, 0));
// Пока ничего не произошло с Aspect — entity ещё не в движке!

// 4. Добавляем entity в движок
engine.entities.addMany(entity);
// Цепочка событий:
//   a) EntityCollection.addMany() → dispatch("onAdded", entity)
//   b) Aspect получает onAdded → trackEntity(entity)
//   c) trackEntity:
//      - подписывается на entity.onAddedComponents / onRemovedComponents
//      - вызывает checkEntity(entity)
//   d) checkEntity:
//      - matchesAll: Position есть? Да. Velocity есть? Да. → true
//      - alreadyIn: false
//      - matches && !alreadyIn → ДОБАВЛЯЕМ в filteredEntities
//
// Результат: aspect.entities = [entity]  ✓

// 5. В игровом цикле
function update() {
  for (const e of aspect.entities) {
    // Здесь гарантированно только entity с Position И Velocity
    const pos = e.components.get(Position);
    const vel = e.components.get(Velocity);
    pos.x += vel.x;
  }
}
```

### Сценарий: динамическое изменение компонентов

```ts
// Допустим, entity имеет только Position (без Velocity)
const entity2 = new MyEntity();
entity2.components.add(new Position(0, 0));
engine.entities.addMany(entity2);
// checkEntity: Position есть, Velocity нет → false → не добавляем
// aspect.entities = [entity]  (только первая)

// Позже добавляем Velocity:
entity2.components.add(new Velocity(2, 3));
// Цепочка:
//   a) ComponentCollection.addMany() → dispatch("onAdded", velocity)
//   b) Entity.onAdded() → dispatch("onAddedComponents", velocity)
//   c) Aspect (подписчик Entity) → checkEntity(entity2)
//   d) matchesAll: Position есть? Да. Velocity есть? Да (только что добавили). → true
//   e) alreadyIn: false → ДОБАВЛЯЕМ
//
// aspect.entities = [entity, entity2]  ✓  Автоматически!
```

---

## Часть 8. Что ещё нужно — System и AbstractEntitySystem

Aspect — это фильтр. Но кто его использует? Системы.

У тебя в проекте два типа систем:

### System — базовый класс

Системы типа `RenderingSystem` и `ResizeSystem` сами создают Aspect
и сами решают, что с ним делать:

```ts
abstract class System {
  engine?: Engine;
  aspect?: Aspect;

  constructor(public priority?: number) {}

  // Вызывается движком, когда систему добавляют в engine.systems
  onAddedToEngine(engine: Engine) {
    this.engine = engine;
  }

  // Каждый кадр движок вызывает этот метод
  abstract process(delta: number): void;
}
```

### AbstractEntitySystem — System с автоматическим Aspect

Системы типа `MovementSystem`, `GravitySystem`, `CollisionSystem` делают
одно и то же: перебирают отфильтрованные сущности и обрабатывают каждую.
Чтобы не дублировать этот код, есть AbstractEntitySystem:

```ts
abstract class AbstractEntitySystem<E extends Entity> extends System {
  constructor(priority?: number, private componentTypes: CompType[] = []) {
    super(priority);
  }

  onAddedToEngine(engine: Engine) {
    super.onAddedToEngine(engine);
    // Автоматически создаёт Aspect из переданных типов компонентов
    this.aspect = Aspect.for(engine).all(...this.componentTypes);
  }

  process(delta: number) {
    // Автоматически перебирает отфильтрованные сущности
    for (const entity of this.aspect!.entities) {
      this.processEntity(entity as E, delta);
    }
  }

  // Подклассу нужно реализовать только обработку ОДНОЙ сущности
  abstract processEntity(entity: E, delta?: number): void;
}
```

**В чём смысл разделения?**

`MovementSystem` не хочет думать о фильтрации. Он просто говорит
"мне нужны Position и Velocity" и реализует `processEntity`:

```ts
class MovementSystem extends AbstractEntitySystem<MyEntity> {
  constructor(priority = 0) {
    super(priority, [Position, Velocity]);  // ← вот и весь фильтр
  }

  processEntity(entity: MyEntity) {        // ← только логика
    const pos = entity.components.get(Position);
    const vel = entity.components.get(Velocity);
    pos.x += vel.x;
    pos.y += vel.y;
  }
}
```

А `RenderingSystem` хочет больше контроля — он сам создаёт Aspect
и сам итерирует:

```ts
class RenderingSystem extends System {
  onAddedToEngine(engine: Engine) {
    this.aspect = Aspect.for(engine).all(Position, Size);
  }

  process(delta: number) {
    this.graphics.clear();
    for (const entity of this.aspect!.entities) {
      // своя логика рисования
    }
    this.pixiApp.render();
  }
}
```

---

## Часть 9. Диаграмма — полная картина

```
  Engine
  ├── entities: EntityCollection ◄──── Aspect подписан
  │     ├── Entity A                     │
  │     │    └── components: [Pos, Vel] ◄┤ Aspect подписан
  │     │                                │   на каждую entity
  │     ├── Entity B                     │
  │     │    └── components: [Pos]      ◄┤
  │     │                                │
  │     └── Entity C                     │
  │          └── components: [Pos, Vel] ◄┘
  │
  └── systems: SystemCollection
        ├── MovementSystem
        │    └── aspect ──────────► Aspect
        │                           ├── allComponents: [Pos, Vel]
        │                           └── filteredEntities: [A, C]
        │                                      (B не подходит — нет Vel)
        └── RenderingSystem
             └── aspect ──────────► Aspect (другой экземпляр!)
                                    ├── allComponents: [Pos, Size]
                                    └── filteredEntities: [...]
```

Каждая система создаёт **свой собственный Aspect** с нужным фильтром.
Один Aspect на систему. Каждый следит за одним и тем же EntityCollection,
но фильтрует по-своему.

---

## Часть 10. Возможные расширения (для справки, реализовывать не обязательно)

### Метод `one()` — нужен хотя бы один компонент

Используется в `ResizeSystem`: `.one(Velocity)` — нужны все entity,
у которых есть Velocity (или любой другой из списка).

Отличие от `all()`:
- `all(A, B)` → нужны И A, И B (`every`)
- `one(A, B)` → нужен ИЛИ A, ИЛИ B (`some`)

```ts
matchesOne(entity: Entity): boolean {
  if (this.oneComponents.length === 0) return true;
  return this.oneComponents.some(
    cls => entity.components.getAll(cls).length > 0
  );
}
```

При этом `checkEntity` должен проверять ОБА условия:
```ts
const matches = this.matchesAll(entity) && this.matchesOne(entity);
```

### Метод `exclude()` — исключить сущности

`exclude(Dead)` — не включать сущности, у которых есть компонент `Dead`.

```ts
matchesExclude(entity: Entity): boolean {
  if (this.excludeComponents.length === 0) return true;
  return this.excludeComponents.every(
    cls => entity.components.getAll(cls).length === 0  // НИ ОДНОГО
  );
}
```
