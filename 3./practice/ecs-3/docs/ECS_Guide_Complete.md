# ECS по исходному коду ecsts — Руководство и план обучения

> Этот документ совмещает два подхода:
> - **Справочный материал** — архитектура ecsts на основе реального исходного кода
> - **Обучающий план** — вопросы, намёки и задания, которые ведут тебя к самостоятельным выводам
>
> **Как работать:** внутри каждого модуля сначала идут вопросы `❓` — думай над ними **до** того как читать референс.
> Код в этом документе — это референс для понимания, не шаблон для копирования.
> Когда пишешь свою реализацию — смотри в исходники ecsts напрямую.

---

## Как устроен каждый модуль

```
❓ Вопросы        — думай до того как читать дальше
🔍 Референс      — архитектура из реального исходника с объяснениями
💡 Намёк         — если совсем застрял (читай в последнюю очередь)
🎯 Задание       — что реализовать самому
✅ Критерий      — как понять что разобрался
```

---

## Содержание

1. [Карта файлов — что где лежит](#1-карта-файлов)
2. [Dispatcher — фундамент всего](#2-dispatcher)
3. [Collection — умный массив с событиями](#3-collection)
4. [Component и ComponentCollection](#4-component-и-componentcollection)
5. [Entity — объект с компонентами](#5-entity)
6. [Aspect — живая выборка сущностей](#6-aspect)
7. [System и AbstractEntitySystem](#7-system-и-abstractentitysystem)
8. [Engine — центральный оркестратор](#8-engine)
9. [Полная карта событий](#9-полная-карта-событий)
10. [Ключевое архитектурное решение ecsts](#10-ключевое-архитектурное-решение-ecsts)
11. [Финальное задание — собери свою реализацию](#11-финальное-задание)
12. [Где искать ответы](#12-где-искать-ответы)

---

## Модуль 0. Запусти пример — до любого кода

🎯 **Задание:** клонируй репо, запусти пример с прямоугольниками, понаблюдай.

```
git clone https://github.com/Trixt0r/ecsts.git
```

🔍 **Смотри:** [`examples/rectangles/`](https://github.com/Trixt0r/ecsts/tree/master/examples/rectangles) или живой пример на [StackBlitz](https://stackblitz.com/edit/ecs-example-rectangles)

❓ **Вопросы для наблюдения — письменно:**
- Что происходит на экране?
- Сколько сущностей ты видишь?
- Можешь ли угадать, какие системы там работают?

✅ **Критерий:** ты можешь своими словами описать что происходит в примере, не глядя в код.

---

## 1. Карта файлов

```
src/core/
├── types.ts              — вспомогательные типы (ArgumentTypes, ComponentClass)
├── dispatcher.ts         — базовый класс: хранит listeners, умеет dispatch()
├── collection.ts         — массив + CollectionListener (onAdded/onRemoved/onCleared/onSorted)
├── component.ts          — пустой интерфейс Component + ComponentCollection
├── entity.ts             — AbstractEntity: хранит компоненты, сам является Dispatcher
├── entity.collection.ts  — специализированный Collection для сущностей
├── aspect.ts             — Aspect: живая отфильтрованная выборка entity
├── system.ts             — System + AbstractEntitySystem
└── engine.ts             — Engine: связывает всё вместе
```

**Направление зависимостей — строго снизу вверх:**

```
types
  ↑
dispatcher
  ↑
collection ← component ← entity ← entity.collection
                                          ↑
                                        aspect
                                          ↑
                                        system
                                          ↑
                                        engine
```

❓ **Вопрос перед стартом:** почему важно реализовывать файлы именно в этом порядке? Что случится если начать с `engine.ts`?

---

## 2. Dispatcher

**Файл:** [`src/core/dispatcher.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/dispatcher.ts)

### ❓ Вопросы — думай до чтения референса

- У тебя есть класс `Engine`. Когда добавляется система, ты хочешь уведомить «кого-то снаружи». Запиши три разных способа как это можно сделать. Что плохого в каждом из них?
- Слушателей может быть несколько, и каждый хочет реагировать на разные события. Как это обобщить в один механизм?
- Что такое `Partial<T>` в TypeScript? Зачем слушатель может быть частичным?
- Чем `fn.apply(listener, args)` отличается от `fn(...args)`? Ключевое слово — контекст `this`.

### 🔍 Референс: архитектура Dispatcher

Dispatcher — это обобщённый **Observer pattern**. Каждый ключевой класс в ecsts (Entity, System, Engine, Collection, Aspect) наследует его.

Ключевые идеи реализации:

**Хранение слушателей:**
```
_listeners:       Partial<T>[]   — список всех слушателей
_lockedListeners: Partial<T>[]   — подмножество: их нельзя удалить
```

**Добавление:**
- `addListener(listener, lock = false)` — если `lock=true`, слушатель попадает ещё и в `_lockedListeners`
- Дубликаты не добавляются (проверяется через `indexOf`)

**Удаление:**
- `removeListener(listenerOrIndex)` — принимает или объект, или индекс
- Если listener в `_lockedListeners` — **бросает ошибку**. Это защита: Engine регистрирует внутренние системные слушатели как locked, чтобы никто снаружи не мог их снять.

**Вызов:**
```
dispatch(name, ...args):
  для каждого listener:
    если у listener есть метод с именем name:
      вызвать fn.apply(listener, args)
```

`fn.apply(listener, args)` — это важно. Контекст `this` внутри метода listener будет сам listener, а не Dispatcher. Именно поэтому в методах слушателя `this` ссылается на объект слушателя.

**`Partial<T>`** означает: слушатель может реализовать только часть интерфейса. `EngineListener` имеет 7 методов, но слушатель может реализовать только `onAddedEntities` — и это нормально. `dispatch` просто пропустит тех, у кого нет нужного метода.

💡 **Намёк:** Dispatcher — это `abstract class`. Ты не создаёшь его напрямую, только наследуешь. Обрати внимание на дженерик `<T>` — это тип интерфейса слушателя.

🎯 **Задание:** реализуй Dispatcher с нуля. Требования:
- Хранит список слушателей произвольного интерфейса `T`
- `addListener` / `removeListener` (с lock-защитой)
- `dispatch(name, ...args)` — вызывает метод по имени у всех слушателей

✅ **Критерий:** напиши тест — два слушателя с разными методами, вызови dispatch, убедись что оба получили вызов. Убедись что locked-слушателя нельзя удалить.

---

## 3. Collection

**Файл:** [`src/core/collection.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/collection.ts)

### ❓ Вопросы — думай до чтения референса

- Что произойдёт, если кто-то добавит систему в `engine.systems`, и движок об этом не узнает?
- Как сделать так, чтобы любое изменение массива автоматически уведомляло подписчиков?
- `CollectionListener` имеет 4 метода. Угадай какие 4 операции с массивом важны для ECS, **до** того как смотреть в код.

### 🔍 Референс: архитектура Collection

Collection — это `Dispatcher<CollectionListener<T>>` с внутренним массивом `_elements`.

**CollectionListener:**
```
onAdded?(...items: T[]):  void   — добавлены элементы
onRemoved?(...items: T[]): void  — удалены элементы
onCleared?():             void   — массив очищен
onSorted?():              void   — массив отсортирован
```

**Ключевая деталь:** `elements` возвращается как `readonly` — снаружи нельзя случайно изменить массив в обход событий.

**Почему это важно для ECS:**
- `engine._systems` — это `Collection<System>`. Когда ты вызываешь `engine.systems.add(mySystem)`, Collection вызывает `dispatch('onAdded', mySystem)`. Engine заранее подписался на этот `onAdded` — и именно там запускается lifecycle системы.
- `engine._entities` — это `EntityCollection<T>` (специализация Collection). Aspect подписывается на неё чтобы знать о новых entity.

💡 **Намёк:** обрати внимание что `Collection` сама наследует `Dispatcher`. Значит у неё есть свои слушатели — `CollectionListener`. И она же может быть частью бо́льшей цепочки.

✅ **Критерий:** нарисуй на бумаге: «кто-то вызывает `collection.add(x)` → что происходит дальше по цепочке».

---

## 4. Component и ComponentCollection

**Файл:** [`src/core/component.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/component.ts)

### ❓ Главный вопрос архитектуры (думай долго)

В большинстве ECS-библиотек (Unity DOTS, bevy, EnTT) компоненты хранятся в **глобальном хранилище движка**, и entity — это просто число (ID):
```ts
world.add(entity, new Position(10, 20));   // типичный ECS
const pos = world.get(entity, Position);
```

В ecsts компоненты хранятся **на самой entity**:
```ts
entity.components.add(new Position(10, 20));  // ecsts
const pos = entity.components.get(Position);
```

❓ Это принципиальное архитектурное решение. Подумай:
- Какие **преимущества** даёт подход ecsts?
- Какие **недостатки**? (погугли "cache locality" и "data-oriented design")
- Почему для учебной библиотеки подход ecsts лучше?
- Что бы ты выбрал для игры с 100 000 entity?

### 🔍 Референс: Component

**`Component`** — пустой интерфейс. Это маркер. Никаких обязательных полей или методов.

```ts
// Реальное определение в ecsts
export interface Component {
  // пусто
}
```

❓ Зачем пустой интерфейс? Если он ничего не требует — что он даёт?

💡 **Намёк:** TypeScript использует структурную типизацию. Пустой интерфейс позволяет `ComponentClass<T extends Component>` — ограничивать тип дженерика. Это и документация («это компонент»), и тип-ограничение.

**`ComponentCollection`** — Collection с одним дополнительным методом:
```
get(ComponentClass) → instance | undefined
```

Именно этот метод делает `entity.components.get(Position)` возможным. Он ищет в `_elements` по конструктору (через `instanceof`).

---

## 5. Entity

**Файл:** [`src/core/entity.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/entity.ts)

### ❓ Вопросы — думай до чтения референса

- `AbstractEntity extends Dispatcher<EntityListener>` И `implements CollectionListener<C>`. Это два разных паттерна одновременно. Зачем?
- В конструкторе: `this._components.addListener(this, true)`. Объект добавляет **себя** как слушателя **своей** коллекции. Что произойдёт когда добавится компонент?
- `lock=true` — почему entity не должна уметь снять себя как слушателя своих компонентов?
- `AbstractEntity` — **абстрактный** класс. Почему? Что ты должен предоставить сам?

### 🔍 Референс: архитектура Entity

**EntityListener:**
```
onAddedComponents?(...components):  void
onRemovedComponents?(...components): void
onClearedComponents?():              void
onSortedComponents?():               void
```

**Ключевые детали AbstractEntity:**

`AbstractEntity` одновременно:
1. **Является Dispatcher** — у неё есть свои слушатели (`EntityListener`). Внешний код может подписаться на изменения компонентов entity.
2. **Реализует CollectionListener** — она сама слушает свой `ComponentCollection`.

В конструкторе:
```
this._components = new ComponentCollection()
this._components.addListener(this, true)  // lock!
```

Когда добавляется компонент, цепочка выглядит так:
```
entity.components.add(new Position())
  → ComponentCollection.dispatch('onAdded', position)
  → entity.onAdded(position)              ← entity слушает свою коллекцию
  → entity.dispatch('onAddedComponents', position)
  → EntityListener-ы получают вызов      ← внешний код
```

`AbstractEntity` — абстрактный, потому что библиотека не знает как ты хочешь генерировать ID. Ты обязан унаследовать и передать ID в `super(id)`.

```ts
// Как ты создаёшь свою entity
let _nextId = 0;
class MyEntity extends AbstractEntity {
  constructor() { super(_nextId++); }
}
```

🎯 **Задание:** нарисуй на бумаге полную цепочку вызовов для:
```ts
entity.components.add(new Velocity(5, 0))
```
Каждый шаг, каждый dispatch, каждый listener.

✅ **Критерий:** ты можешь объяснить всю цепочку не глядя в код.

---

## 6. Aspect

**Файл:** [`src/core/aspect.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/aspect.ts)

Это самый сложный модуль. Не торопись.

### ❓ Вопросы — сформулируй проблему до чтения

- У тебя тысячи entity. `MovementSystem` нужны только те, у которых есть `Position` и `Velocity`. Как бы ты это сделал **наивно**, без Aspect?
- Почему этот наивный способ плох? (Подсказка: O(n) каждый кадр)
- Какую структуру данных нужно поддерживать, чтобы получить список нужных entity мгновенно?
- Когда эта структура должна обновляться?

### 🔍 Референс: архитектура Aspect

**AspectListener:**
```
onAddedEntities?(...entities):   void   — entity вошли в выборку
onRemovedEntities?(...entities): void   — entity вышли из выборки
onClearedEntities?():            void
onSortedEntities?():             void

// Для entity, которые УЖЕ в выборке:
onAddedComponents?(entity, ...components):  void
onRemovedComponents?(entity, ...components): void
onClearedComponents?(entity):               void
onSortedComponents?(entity):                void
```

**Три типа фильтров:**
```ts
Aspect.for(engine, all?, exclude?, one?)

// all     — у entity ДОЛЖНЫ БЫТЬ все перечисленные компоненты
// exclude — у entity НЕ ДОЛЖНО БЫТЬ ни одного из них
// one     — у entity ДОЛЖЕН БЫТЬ хотя бы ОДИН из них
```

**Как Aspect работает — ключевые механизмы:**

Aspect подписывается на **два источника**:
1. `engine.entities` (EntityCollection) — чтобы знать о появлении и удалении entity
2. Каждую entity **индивидуально** — чтобы знать об изменениях её компонентов

При любом изменении вызывается внутренний `checkAndUpdate(entity)`:
- Проверяет фильтры `all`, `exclude`, `one`
- Если entity подходит и её нет в выборке → добавляет, dispatch `onAddedEntities`
- Если entity не подходит и она есть в выборке → удаляет, dispatch `onRemovedEntities`

`detach()` — отписывается от всего (от engine и от всех entity). Вызывается когда система удаляется из движка.

**Статический factory vs конструктор:**
```ts
// Рекомендуемый способ:
Aspect.for(engine, [Position, Velocity], [Frozen], [])
//   static factory — сразу привязывается к engine

// Используется в AbstractEntitySystem:
this.aspect = Aspect.for(engine, this.all, this.exclude, this.one)
```

❓ **Самый важный вопрос — нарисуй на бумаге:**

Entity добавлена в движок без компонентов. Потом добавляется `Position`, потом `Velocity`. Aspect ждёт обоих. В какой именно момент entity попадёт в Aspect? Сколько раз вызывается `checkAndUpdate`?

❓ **Разграничение событий — понять чётко:**
- `onAddedEntities` — entity **впервые** попала в выборку (набрала все нужные компоненты)
- `onAddedComponents(entity, ...)` — у entity, которая **уже в выборке**, добавился ещё один компонент

Придумай реальный игровой сценарий когда нужен каждый из них.

✅ **Критерий:** ты можешь нарисовать все сценарии появления и исчезновения entity из Aspect.

---

## 7. System и AbstractEntitySystem

**Файл:** [`src/core/system.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/system.ts)

### ❓ Вопросы — думай до чтения референса

- `system.engine` — это property с setter. Что должно происходить при присваивании `system.engine = someEngine`?
- `system.active = false` — помимо флага, что ещё должно произойти?
- Зачем `_updating`? Придумай сценарий где это важно.
- `onError` — что случится если его не переопределить и в `process()` выбросится ошибка?

### 🔍 Референс: архитектура System

**SystemListener:**
```
onActivated?():                   void   — system.active = true
onDeactivated?():                 void   — system.active = false
onAddedToEngine?(engine):         void   — система добавлена в engine
onRemovedFromEngine?(engine):     void   — система удалена из engine
onError?(error):                  void   — ошибка в process()
```

**`System` — базовый класс:**

`active` и `engine` — это **properties с setters**. Это ключевое решение:

```
set active(value):
  если не изменилось — выходим
  меняем флаг
  вызываем виртуальный метод (onActivated / onDeactivated)
  dispatch события слушателям

set engine(engine):
  если не изменилось — выходим
  запоминаем старый engine
  меняем _engine
  если был старый engine → onRemovedFromEngine(old) + dispatch
  если новый engine не null → onAddedToEngine(new) + dispatch
```

Это значит: когда Engine пишет `system.engine = this` — автоматически запускается весь lifecycle.

**Запуск системы:**
```
run(options, mode):
  mode = SYNC  → runSync(options)  → process(options)
  mode = ASYNC → runAsync(options) → await process(options)

runSync:  try { process() } catch → onError + dispatch
runAsync: _updating=true, try { await process() } finally { _updating=false }
```

**`EngineMode` и `SystemMode`:**
```
EngineMode.DEFAULT    — все системы sync, без ожидания
EngineMode.SUCCESSIVE — async, ждём каждую систему по очереди
EngineMode.PARALLEL   — async, все системы параллельно

engine.run(delta)                              // DEFAULT
await engine.run(delta, EngineMode.SUCCESSIVE) // последовательно
await engine.run(delta, EngineMode.PARALLEL)   // параллельно
```

---

### 🔍 Референс: AbstractEntitySystem

`AbstractEntitySystem extends System implements AspectListener`

Это значит: **система сама является слушателем Aspect**. Когда она добавляется в `aspect.listeners`, вызовы `onAddedEntities`, `onRemovedEntities` и т.д. приходят прямо в методы системы.

**Жизненный цикл через lifecycle-хуки:**

```
onAddedToEngine(engine):         ← вызывается Engine автоматически
  this.aspect = Aspect.for(engine, all, exclude, one)
  this.aspect.addListener(this)  ← система слушает свой Aspect

onRemovedFromEngine():           ← вызывается Engine автоматически
  aspect.removeListener(this)
  aspect.detach()
  aspect = null
```

**Методы которые ты переопределяешь:**
```
onAddedEntities(...entities)   — entity вошла в Aspect → инициализация
onRemovedEntities(...entities) — entity вышла из Aspect → очистка

onAddedComponents(entity, ...) — компонент добавлен у entity, уже в Aspect
onRemovedComponents(entity,..) — компонент удалён у entity, уже в Aspect

processEntity(entity, index, entities, options) — вызывается каждый кадр
```

**`process()` уже реализован** — ты не трогаешь его. Он берёт `aspect.entities` и вызывает `processEntity()` для каждой.

❓ **Вопрос:** найди в исходнике строки где `process()` берёт entity. Что происходит если `this.aspect` равен `null`?

🎯 **Задание:** напиши `MovementSystem`, которая наследует `System` напрямую (не `AbstractEntitySystem`). Вручную создай Aspect в `onAddedToEngine`, вручную итерируй в `process()`. Это поможет понять что `AbstractEntitySystem` просто автоматизирует.

✅ **Критерий:** система написанная через `System` работает так же, как через `AbstractEntitySystem`.

---

## 8. Engine

**Файл:** [`src/core/engine.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/engine.ts)

### ❓ Вопросы — думай до чтения референса

- Engine должен знать когда система добавлена. Как он это узнаёт? (Подсказка: Collection)
- Когда `system.engine = this` — что запускается в системе?
- Почему Engine хранит `_activeSystems` отдельно от `_systems`? Когда они расходятся?
- `priority` — кто отвечает за сортировку?

### 🔍 Референс: архитектура Engine

**EngineListener:**
```
onAddedSystems?(...systems):        void
onRemovedSystems?(...systems):      void
onClearedSystems?():                void
onErrorBySystem?(error, system):    void   ← ошибка из любой системы

onAddedEntities?(...entities):      void
onRemovedEntities?(...entities):    void
onClearedEntities?():               void
```

**Внутренняя структура:**
```
_systems:       Collection<System>
_entities:      EntityCollection<T>
_activeSystems: System[]            ← только те у кого active=true, frozen
```

**В конструкторе Engine подписывается на обе коллекции с `lock=true`:**

На `_systems.onAdded`:
```
1. Сортируем _systems по priority (меньше = раньше)
2. Для каждой системы:
   a. system.engine = this          ← запускает onAddedToEngine в системе
   b. updatedActiveSystems()        ← обновляем кеш активных
   c. Добавляем locked listener:    ← слушаем active/error системы
      - onActivated   → updatedActiveSystems()
      - onDeactivated → updatedActiveSystems()
      - onError       → dispatch('onErrorBySystem', ...)
3. dispatch('onAddedSystems', ...)
```

На `_systems.onRemoved`:
```
system.engine = null    ← запускает onRemovedFromEngine в системе
updatedActiveSystems()
dispatch('onRemovedSystems', ...)
```

На `_entities` — просто перенаправляет события в `EngineListener`.

**Почему `lock=true`:** это внутренние системные слушатели. Если кто-то снаружи сможет их удалить — Engine сломается. Lock защищает от этого.

**Priority и порядок:**
```ts
engine.systems.add(new RenderSystem(10));   // третья
engine.systems.add(new GravitySystem(0));   // первая
engine.systems.add(new MovementSystem(1));  // вторая
// Реальный порядок: Gravity(0) → Movement(1) → Render(10)
```

**Добавление entity — два варианта, один результат:**
```ts
// Вариант A: сначала компоненты, потом в engine
entity.components.add(new Position());
entity.components.add(new Velocity());
engine.entities.add(entity);
// → Aspect видит entity со всеми компонентами сразу

// Вариант B: сначала в engine, потом компоненты
engine.entities.add(entity);
entity.components.add(new Position());   // Aspect: не подходит ещё
entity.components.add(new Velocity());   // Aspect: теперь подходит!
```

❓ **Вопрос:** результат одинаковый? Нарисуй цепочку для каждого варианта.

✅ **Критерий:** пройди весь путь от `engine.entities.add(entity)` до `system.processEntity(entity)` — каждый шаг — без подсказок.

---

## 9. Полная карта событий

### Цепочка при добавлении системы

```
engine.systems.add(mySystem)
    │
    ▼
Collection.dispatch('onAdded', mySystem)
    │
    ▼  (Engine's locked listener на _systems)
systems сортируются по priority
    │
    ▼
mySystem.engine = engine
    │
    ├── mySystem.onRemovedFromEngine(old)   ← если был в другом engine
    │
    └── mySystem.onAddedToEngine(engine)   ← ГЛАВНЫЙ LIFECYCLE ХУК
            │
            ▼  (если AbstractEntitySystem)
     Aspect.for(engine, all, exclude, one) ← создаётся Aspect
     aspect.addListener(mySystem)          ← система слушает Aspect
```

### Цепочка при добавлении entity + компонентов

```
engine.entities.add(entity)
    │
    ├── Engine.dispatch('onAddedEntities', entity)   → EngineListener
    └── Aspect подписывается на entity, checkAndUpdate:
        → нет нужных компонентов → не попадает


entity.components.add(new Position())
    │
    └── ComponentCollection → entity.onAdded(position)
        → entity.dispatch('onAddedComponents', position)
            │
            └── Aspect.checkAndUpdate(entity)
                → есть Position, нет Velocity → не попадает


entity.components.add(new Velocity())
    │
    └── ComponentCollection → entity.onAdded(velocity)
        → entity.dispatch('onAddedComponents', velocity)
            │
            └── Aspect.checkAndUpdate(entity)
                → есть Position И Velocity → ПОПАДАЕТ!
                → aspect.dispatch('onAddedEntities', entity)
                        │
                        ▼  (AbstractEntitySystem слушает Aspect)
                 mySystem.onAddedEntities(entity)  ← ВЫЗЫВАЕТСЯ
```

### Цепочка при удалении системы

```
engine.systems.remove(mySystem)
    │
    ▼
mySystem.engine = null
    │
    └── mySystem.onRemovedFromEngine(engine)
            │
            ▼  (AbstractEntitySystem)
        aspect.removeListener(mySystem)
        aspect.detach()   ← отписываемся от engine и всех entity
```

### Сводная таблица всех событий

| Класс | Listener Interface | Методы |
|---|---|---|
| Entity | `EntityListener` | `onAddedComponents`, `onRemovedComponents`, `onClearedComponents`, `onSortedComponents` |
| Collection | `CollectionListener` | `onAdded`, `onRemoved`, `onCleared`, `onSorted` |
| Aspect | `AspectListener` | `onAddedEntities`, `onRemovedEntities`, `onClearedEntities`, `onSortedEntities`, `onAddedComponents(entity,...)`, `onRemovedComponents(entity,...)`, `onClearedComponents(entity)`, `onSortedComponents(entity)` |
| System | `SystemListener` | `onActivated`, `onDeactivated`, `onAddedToEngine`, `onRemovedFromEngine`, `onError` |
| Engine | `EngineListener` | `onAddedSystems`, `onRemovedSystems`, `onClearedSystems`, `onErrorBySystem`, `onAddedEntities`, `onRemovedEntities`, `onClearedEntities` |

---

## 10. Ключевое архитектурное решение ecsts

### Компоненты на entity, не в мире

| Аспект | Глобальное хранилище (Unity, bevy, EnTT) | ecsts (на entity) |
|---|---|---|
| Доступ | `world.get(entity, Position)` | `entity.components.get(Position)` |
| Entity — это | Просто `number` | Объект с ID и компонентами |
| Cache locality | Отличная (SoA) | Хуже (объекты в heap) |
| Событийная модель | Глобальная | Локальная (на entity) + Aspect |
| Сложность реализации | Выше | Ниже, код читаем |

❓ **Вопрос для размышления:** ecsts выбирает простоту в обмен на максимальную производительность. Когда это правильный trade-off?

### Главный инсайт

> Всё построено на цепочке Dispatcher-ов. Entity слушает ComponentCollection. Engine слушает EntityCollection и SystemCollection. Aspect слушает Entity и EntityCollection. Система слушает Aspect.
>
> Это реактивная система без единого глобального EventBus — каждый объект знает только о своих непосредственных источниках событий.

---

## 11. Финальное задание — собери свою реализацию

### Правила

1. Пишешь **без copy-paste** кода из этого документа
2. Используешь ecsts как **референс** — открываешь когда застрял
3. Называй файлы так же, реализуй те же интерфейсы
4. После каждого файла — контрольные вопросы

### Порядок реализации

```
1. types.ts           — ComponentClass, ArgumentTypes
2. dispatcher.ts      — Dispatcher<T>
3. collection.ts      — CollectionListener, Collection<T>
4. component.ts       — Component, ComponentCollection
5. entity.ts          — EntityListener, AbstractEntity
6. entity.collection  — EntityCollection
7. aspect.ts          — AspectListener, Aspect      ← самый сложный
8. system.ts          — SystemListener, System, AbstractEntitySystem
9. engine.ts          — EngineListener, Engine
```

### После каждого файла задай себе

- Могу ли я объяснить зачем этот класс существует?
- Какие события он генерирует и на какие подписывается?
- Что случится если его убрать из системы?

### Финальный тест реализации

Запусти против своего кода этот сценарий — **по шагам**, с проверкой после каждого:

```ts
// 1. Создай Engine
// 2. Добавь MovementSystem (AbstractEntitySystem, фильтр: Position+Velocity)
// 3. Создай entity без компонентов, добавь в engine

// ✓ onAddedEntities НЕ должен был вызваться

// 4. Добавь Position к entity

// ✓ onAddedEntities НЕ должен был вызваться

// 5. Добавь Velocity к entity

// ✓ onAddedEntities ДОЛЖЕН был вызваться ← entity в Aspect

// 6. Вызови engine.run(1/60) несколько раз

// ✓ processEntity вызывается каждый run для этой entity

// 7. Удали Velocity у entity

// ✓ onRemovedEntities ДОЛЖЕН был вызваться
// ✓ processEntity больше НЕ вызывается для этой entity

// 8. system.active = false

// ✓ система не выполняется, но Aspect продолжает обновляться
```

### Дополнительные вопросы для размышления

- Что будет если один из listeners бросит исключение в `dispatch`? Остальные получат вызов?
- Что произойдёт с Aspect если entity добавляется в два разных Engine?
- Можно ли добавить одну систему в два Engine? Что произойдёт?
- `system.active = false` — Aspect продолжает обновляться? Проверь по коду.
- Как оптимизировать `dispatch` если у большинства listeners нет нужного метода?

---

## 12. Где искать ответы

| Тема | Ссылка |
|---|---|
| Исходный код ecsts — все файлы | [github.com/Trixt0r/ecsts/tree/master/src/core](https://github.com/Trixt0r/ecsts/tree/master/src/core) |
| Живой пример на StackBlitz | [stackblitz.com/edit/ecs-example-rectangles](https://stackblitz.com/edit/ecs-example-rectangles) |
| ECS FAQ — концепции | [github.com/SanderMertens/ecs-faq](https://github.com/SanderMertens/ecs-faq) |
| Observer pattern | [refactoring.guru/design-patterns/observer](https://refactoring.guru/design-patterns/observer) |
| TypeScript Generics | [typescriptlang.org/docs/handbook/2/generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) |
| `apply` vs `call` | [MDN: Function.prototype.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) |
| Data-Oriented Design | [dataorienteddesign.com/dodbook](https://www.dataorienteddesign.com/dodbook/) |
| Cache locality объяснение | [gamesfromwithin.com/data-oriented-design](http://gamesfromwithin.com/data-oriented-design) |

---

## Правило одного вопроса

Когда застрял — **не гугли сразу**. Сначала:
1. Перефразируй вопрос своими словами
2. Открой исходник ecsts и найди место где это решается
3. Прочитай код и попробуй угадать почему именно так
4. Только если не помогло — задай вопрос ментору или поищи

Это медленнее. Это и есть обучение.
