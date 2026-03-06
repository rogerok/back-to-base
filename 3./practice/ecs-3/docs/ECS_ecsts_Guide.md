# ECS по исходному коду ecsts — Полное руководство

> Гайд основан на **реальном исходном коде** библиотеки [@trixt0r/ecs](https://github.com/Trixt0r/ecsts).
> Цель: понять архитектуру настолько глубоко, чтобы написать свою реализацию.

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
10. [Ключевое отличие ecsts от других ECS](#10-ключевое-отличие-ecsts)
11. [Как это всё использовать — полный пример](#11-полный-пример)
12. [Пошаговый план своей реализации](#12-пошаговый-план-своей-реализации)

---

## 1. Карта файлов

```
src/core/
├── types.ts              — вспомогательные типы (ArgumentTypes, ComponentClass)
├── dispatcher.ts         — базовый класс с listeners и dispatch()
├── collection.ts         — массив + CollectionListener (onAdded/onRemoved/onCleared/onSorted)
├── component.ts          — пустой интерфейс Component + ComponentCollection
├── entity.ts             — AbstractEntity: хранит компоненты, сам является Dispatcher
├── entity.collection.ts  — специализированный Collection для сущностей
├── aspect.ts             — Aspect: живая отфильтрованная выборка entity
├── system.ts             — System + AbstractEntitySystem
└── engine.ts             — Engine: связывает всё вместе
```

**Направление зависимостей:**

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

---

## 2. Dispatcher

**Файл:** `dispatcher.ts`

Это основа всей событийной модели ecsts. **Каждый ключевой класс** — Entity, System, Engine, Collection, Aspect — наследует Dispatcher.

### Концепция

Dispatcher — это объект, который хранит список **слушателей** (listeners) и умеет вызывать на них методы по имени. Слушатель — это любой объект, реализующий нужный интерфейс (частично — `Partial<T>`).

### Реальная реализация

```ts
// dispatcher.ts — точная копия из исходников
export abstract class Dispatcher<T> {
  protected _listeners: Partial<T>[];
  protected _lockedListeners: Partial<T>[];  // нельзя удалить

  constructor() {
    this._listeners = [];
    this._lockedListeners = [];
  }

  get listeners(): readonly Partial<T>[] {
    return this._listeners.slice();  // возвращает копию
  }

  // lock=true → слушателя нельзя удалить (используется внутри Engine)
  addListener(listener: Partial<T>, lock = false): boolean {
    if (this._listeners.indexOf(listener) >= 0) return false; // уже есть
    this._listeners.push(listener);
    if (lock) this._lockedListeners.push(listener);
    return true;
  }

  removeListener(listenerOrIndex: Partial<T> | number): boolean {
    const idx = typeof listenerOrIndex === 'number'
      ? listenerOrIndex
      : this._listeners.indexOf(listenerOrIndex);
    if (idx < 0 || idx >= this._listeners.length) return false;
    const listener = this._listeners[idx];
    // Locked слушателей удалить НЕЛЬЗЯ — бросает ошибку
    if (this._lockedListeners.indexOf(listener) >= 0) {
      throw new Error(`Listener at index ${idx} is locked.`);
    }
    this._listeners.splice(idx, 1);
    return true;
  }

  // Главный метод: вызывает fn(args) у всех слушателей, у которых он есть
  dispatch<K extends keyof T>(name: K, ...args: ArgumentTypes<T[K]>): void {
    this._listeners.forEach(listener => {
      const fn = listener[name];
      if (typeof fn !== 'function') return;
      fn.apply(listener, args);  // scope = сам listener
    });
  }
}
```

### Ключевые детали

**`Partial<T>`** означает, что слушатель может реализовывать только часть интерфейса. Например, EngineListener имеет 7 методов, но слушатель может реализовать только один — `onAddedEntities`. Это нормально.

**`lock = true`** — слушателей, добавленных с lock, нельзя удалить через `removeListener`. Engine использует это для системных слушателей (например, внутренний слушатель, обновляющий список активных систем). Попытка удалить locked-слушателя бросает ошибку.

**`dispatch(name, ...args)`** — проходит по всем listeners, находит у каждого метод с именем `name` (если есть), вызывает его. Scope вызова = сам listener (`fn.apply(listener, args)`).

---

## 3. Collection

**Файл:** `collection.ts`

Collection — это массив с событиями. Используется для хранения систем и сущностей в Engine.

### Интерфейс CollectionListener

```ts
export interface CollectionListener<T> {
  onAdded?(...items: T[]): void;    // добавлены элементы
  onRemoved?(...items: T[]): void;  // удалены элементы
  onCleared?(): void;               // массив очищен
  onSorted?(): void;                // массив отсортирован
}
```

### Концепция реализации

```ts
// Упрощённое понимание Collection — реальный код сложнее
class Collection<T> extends Dispatcher<CollectionListener<T>> {
  protected _elements: T[] = [];

  get elements(): readonly T[] { return this._elements; }

  add(...items: T[]): void {
    // добавляет в _elements
    // dispatch('onAdded', ...items)
  }

  remove(...items: T[]): void {
    // удаляет из _elements
    // dispatch('onRemoved', ...items)
  }

  clear(): void {
    this._elements = [];
    // dispatch('onCleared')
  }

  sort(compareFn?: (a: T, b: T) => number): void {
    this._elements.sort(compareFn);
    // dispatch('onSorted')
  }
}
```

### Почему это важно

Когда ты делаешь `engine.systems.add(mySystem)`, Collection вызывает `dispatch('onAdded', mySystem)`. Engine заранее зарегистрировал на `_systems` locked-слушателя, который при `onAdded` устанавливает `system.engine = this` — и тем самым запускает lifecycle системы.

---

## 4. Component и ComponentCollection

**Файл:** `component.ts`

### Component — просто маркер

```ts
// component.ts — реальное определение
export interface Component {
  // Пустой интерфейс — маркер
  // Никаких обязательных полей или методов
}
```

Компонент — это **любой класс**, реализующий этот пустой интерфейс. На практике ты просто пишешь `implements Component`, и всё.

```ts
// Твои компоненты
class Position implements Component {
  constructor(public x = 0, public y = 0) {}
}

class Velocity implements Component {
  constructor(public dx = 0, public dy = 0) {}
}

class Health implements Component {
  constructor(public current = 100, public max = 100) {}
}

// Тег — компонент без данных
class Frozen implements Component {}
class Dead implements Component {}
```

### ComponentCollection

ComponentCollection — специализированный Collection для компонентов. Ключевая особенность: поиск компонента по **классу** (конструктору).

```ts
// Концепция — как это должно работать
class ComponentCollection<C extends Component> extends Collection<C> {

  // Получить компонент по классу-конструктору
  get<T extends C>(ctor: new(...args: any[]) => T): T | undefined {
    return this._elements.find(c => c instanceof ctor) as T | undefined;
  }

  // В реальном ecsts используется ComponentClass из types.ts:
  // type ComponentClass<T> = new (...args: any[]) => T
}
```

**Использование:**
```ts
entity.components.add(new Position(10, 20));
entity.components.add(new Velocity(1, 0));

const pos = entity.components.get(Position);   // → Position instance
const vel = entity.components.get(Velocity);   // → Velocity instance
```

---

## 5. Entity

**Файл:** `entity.ts`

### Главное открытие: в ecsts компоненты хранятся НА сущности

Это принципиально отличается от большинства ECS. Нет глобального ComponentRegistry. Каждая Entity сама хранит свои компоненты в `entity.components`.

### EntityListener

```ts
export interface EntityListener<C extends Component = Component> {
  onAddedComponents?(...components: C[]): void;    // компоненты добавлены
  onRemovedComponents?(...components: C[]): void;  // компоненты удалены
  onClearedComponents?(): void;                    // все компоненты удалены
  onSortedComponents?(): void;                     // компоненты отсортированы
}
```

### AbstractEntity — реальная реализация

```ts
// entity.ts — точная структура
export abstract class AbstractEntity<
  C extends Component = Component,
  L extends EntityListener = EntityListener<C>
>
extends Dispatcher<L>              // Entity сама является Dispatcher!
implements CollectionListener<C>   // Слушает свой ComponentCollection
{
  protected _components: ComponentCollection<C>;

  constructor(public readonly id: number | string) {
    super();
    this._components = new ComponentCollection<C>();
    // Entity подписывается на свою коллекцию компонентов
    // lock=true → этот listener нельзя снять
    this._components.addListener(this, true);
  }

  get components(): ComponentCollection<C> {
    return this._components;
  }

  // Методы CollectionListener — перенаправляют события ComponentCollection
  // в события EntityListener (переименовывая их)
  onAdded(...components: C[]): void {
    // ComponentCollection вызвал onAdded → Entity диспатчит onAddedComponents
    this.dispatch('onAddedComponents', ...components);
  }

  onRemoved(...components: C[]): void {
    this.dispatch('onRemovedComponents', ...components);
  }

  onCleared(): void {
    this.dispatch('onClearedComponents');
  }

  onSorted(): void {
    this.dispatch('onSortedComponents');
  }
}
```

### Как создать Entity

Поскольку AbstractEntity — **абстрактный класс**, ты обязан его расширить и предоставить ID:

```ts
import { AbstractEntity } from '@trixt0r/ecs';

// Простейшая реализация — ты сам решаешь как генерировать ID
let _nextId = 0;

class MyEntity extends AbstractEntity {
  constructor() {
    super(_nextId++);  // или uuid(), или что угодно
  }
}

// Использование
const entity = new MyEntity();
entity.components.add(new Position(10, 20));
entity.components.add(new Velocity(1, 0));

// Получить компонент
const pos = entity.components.get(Position);
pos.x += 5;

// Слушать изменения компонентов
entity.addListener({
  onAddedComponents(...comps) {
    console.log('Добавлены компоненты:', comps);
  },
  onRemovedComponents(...comps) {
    console.log('Удалены компоненты:', comps);
  }
});
```

### Схема событий Entity

```
entity.components.add(new Velocity(1, 0))
           │
           ▼
   ComponentCollection.dispatch('onAdded', velocity)
           │
           ▼ (Entity подписана на свой ComponentCollection)
   Entity.onAdded(velocity)
           │
           ▼
   Entity.dispatch('onAddedComponents', velocity)
           │
      ┌────┴────────────────────┐
      ▼                         ▼
  EntityListener A          AspectListener
  (твой код)                (Aspect проверяет,
                             подходит ли entity)
```

---

## 6. Aspect

**Файл:** `aspect.ts`

Это самый сложный и самый важный класс. Разберём его полностью.

### Что такое Aspect

Aspect — это **живая отфильтрованная выборка** entity из движка. Он автоматически обновляется при добавлении/удалении компонентов у любой entity.

Критически важно: Aspect **не хранит компоненты**. Он хранит список entity, удовлетворяющих критериям фильтрации.

### AspectListener

```ts
export interface AspectListener {
  // Новые entity добавлены в выборку
  onAddedEntities?(...entities: AbstractEntity[]): void;
  // Entity удалены из выборки
  onRemovedEntities?(...entities: AbstractEntity[]): void;
  // Выборка очищена
  onClearedEntities?(): void;
  // Выборка отсортирована
  onSortedEntities?(): void;

  // Компоненты изменились у entity, которая УЖЕ в выборке
  onAddedComponents?(entity: AbstractEntity, ...components: Component[]): void;
  onRemovedComponents?(entity: AbstractEntity, ...components: Component[]): void;
  onClearedComponents?(entity: AbstractEntity): void;
  onSortedComponents?(entity: AbstractEntity): void;
}
```

### Три типа фильтров

```ts
// all: у entity ДОЛЖНЫ БЫТЬ все перечисленные компоненты
Aspect.for(engine).all(Position, Velocity)

// exclude: у entity НЕ ДОЛЖНО БЫТЬ ни одного из перечисленных
Aspect.for(engine).all(Position).exclude(Frozen)

// one: у entity ДОЛЖЕН БЫТЬ хотя бы ОДИН из перечисленных
Aspect.for(engine).all(Health).one(Enemy, Boss)

// Комбинировать можно всё вместе:
Aspect.for(engine, [Position, Velocity], [Frozen], [Enemy, Boss])
//                   all                   exclude    one
```

### Как Aspect работает внутри — концептуальная реализация

```ts
// Концепция — как устроен Aspect
class Aspect extends Dispatcher<AspectListener> {
  private _entities: AbstractEntity[] = [];

  // Aspect подписывается на две вещи:
  // 1) EntityCollection движка (когда entity добавляют/удаляют из движка)
  // 2) Каждую entity индивидуально (когда у неё меняются компоненты)

  static for(engine: Engine, all?, exclude?, one?): Aspect {
    const aspect = new Aspect(all, exclude, one);
    aspect.attach(engine);
    return aspect;
  }

  private attach(engine: Engine): void {
    // Подписка на коллекцию entity движка
    engine.entities.addListener({
      onAdded: (...entities) => {
        // Новые entity добавлены в движок → проверяем каждую
        for (const entity of entities) {
          this.subscribeToEntity(entity);  // начинаем слушать эту entity
          this.checkAndUpdate(entity);     // проверяем, попадает ли в фильтр
        }
      },
      onRemoved: (...entities) => {
        for (const entity of entities) {
          this.unsubscribeFromEntity(entity);
          this.removeFromAspect(entity);
        }
      },
      onCleared: () => {
        this._entities = [];
        this.dispatch('onClearedEntities');
      }
    });

    // Добавляем уже существующие entity в движке
    for (const entity of engine.entities.elements) {
      this.subscribeToEntity(entity);
      this.checkAndUpdate(entity);
    }
  }

  detach(): void {
    // Отписываемся от движка и от всех entity
    // Вызывается в onRemovedFromEngine системы
  }

  private subscribeToEntity(entity: AbstractEntity): void {
    // Слушаем изменения компонентов на конкретной entity
    entity.addListener({
      onAddedComponents: (...comps) => {
        this.checkAndUpdate(entity);
        // Если entity УЖЕ в выборке → уведомляем слушателей Aspect
        if (this._entities.includes(entity)) {
          this.dispatch('onAddedComponents', entity, ...comps);
        }
      },
      onRemovedComponents: (...comps) => {
        this.checkAndUpdate(entity);
        if (this._entities.includes(entity)) {
          this.dispatch('onRemovedComponents', entity, ...comps);
        }
      },
      onClearedComponents: () => {
        this.checkAndUpdate(entity);
      },
    });
  }

  private checkAndUpdate(entity: AbstractEntity): void {
    const matches  = this.matches(entity);
    const inAspect = this._entities.includes(entity);

    if (matches && !inAspect) {
      this._entities.push(entity);
      this.dispatch('onAddedEntities', entity);  // entity вошла в Aspect
    } else if (!matches && inAspect) {
      const idx = this._entities.indexOf(entity);
      this._entities.splice(idx, 1);
      this.dispatch('onRemovedEntities', entity);  // entity вышла из Aspect
    }
  }

  private matches(entity: AbstractEntity): boolean {
    // Проверяем all (все обязательные)
    for (const ctor of this.allTypes) {
      if (!entity.components.get(ctor)) return false;
    }
    // Проверяем exclude (ни одного из этих)
    for (const ctor of this.excludeTypes) {
      if (entity.components.get(ctor)) return false;
    }
    // Проверяем one (хотя бы один)
    if (this.oneTypes.length > 0) {
      const hasOne = this.oneTypes.some(ctor => entity.components.get(ctor));
      if (!hasOne) return false;
    }
    return true;
  }

  get entities(): readonly AbstractEntity[] {
    return this._entities;
  }
}
```

### Когда используется Aspect.for() vs constructor

```ts
// Способ 1: Через static factory (рекомендуемый)
// Автоматически привязывается к engine сразу
const aspect = Aspect.for(engine).all(Position, Velocity).exclude(Frozen);

// Способ 2: Через constructor с параметрами (используется в AbstractEntitySystem)
// Параметры: (engine, all[], exclude[], one[])
const aspect = Aspect.for(engine, [Position, Velocity], [Frozen], []);

// Доступ к entity
for (const entity of aspect.entities) {
  const pos = entity.components.get(Position)!;
  // ...
}
```

---

## 7. System и AbstractEntitySystem

**Файл:** `system.ts`

### SystemListener

```ts
export interface SystemListener {
  onActivated?(): void;                        // system.active = true
  onDeactivated?(): void;                      // system.active = false
  onAddedToEngine?(engine: Engine): void;      // system добавлена в engine
  onRemovedFromEngine?(engine: Engine): void;  // system удалена из engine
  onError?(error: Error): void;                // ошибка в process()
}
```

### System — базовый класс

```ts
// system.ts — структура System
export abstract class System<L extends SystemListener = SystemListener, T = any>
  extends Dispatcher<L>
{
  protected _active   = true;
  protected _updating = false;
  protected _engine: Engine | null = null;

  constructor(public priority = 0) {
    super();
  }

  // active — с событиями
  get active(): boolean { return this._active; }
  set active(value: boolean) {
    if (value === this._active) return;
    this._active = value;
    // Вызывает виртуальный метод И диспатчит событие слушателям
    if (value) {
      this.onActivated();
      this.dispatch('onActivated');
    } else {
      this.onDeactivated();
      this.dispatch('onDeactivated');
    }
  }

  // engine — с lifecycle
  get engine(): Engine | null { return this._engine; }
  set engine(engine: Engine | null) {
    if (engine === this._engine) return;
    const oldEngine = this._engine;
    this._engine = engine;

    if (oldEngine instanceof Engine) {
      // Сначала вызываем виртуальный метод, потом диспатчим
      this.onRemovedFromEngine(oldEngine);
      this.dispatch('onRemovedFromEngine', oldEngine);
    }
    if (engine instanceof Engine) {
      this.onAddedToEngine(engine);
      this.dispatch('onAddedToEngine', engine);
    }
  }

  get updating(): boolean { return this._updating; }

  // Запуск
  run(options: T, mode: SystemMode = SystemMode.SYNC): void | Promise<void> {
    return this[mode].call(this, options);  // runSync или runAsync
  }

  protected runSync(options: T): void {
    try {
      this.process(options);
    } catch(e) {
      this.onError(e as Error);
      this.dispatch('onError', e as Error);
    }
  }

  protected async runAsync(options: T): Promise<void> {
    this._updating = true;
    try {
      await this.process(options);
    } catch(e) {
      this.onError(e as Error);
      this.dispatch('onError', e as Error);
    } finally {
      this._updating = false;
    }
  }

  // Виртуальные методы — переопределяй их в своей системе
  onActivated(): void {}
  onDeactivated(): void {}
  onAddedToEngine(engine: Engine): void {}
  onRemovedFromEngine(engine: Engine): void {}
  onError(error: Error): void {}

  // Единственный обязательный метод
  abstract process(options: T): void | Promise<void>;
}
```

### EngineMode и SystemMode

```ts
// Как запускать движок
export enum EngineMode {
  DEFAULT    = 'runDefault',    // sync, без ожидания завершения
  SUCCESSIVE = 'runSuccessive', // async, ждём каждую систему по очереди
  PARALLEL   = 'runParallel',   // async, все системы параллельно
}

// Как запускать отдельную систему
export enum SystemMode {
  SYNC  = 'runSync',  // синхронно
  ASYNC = 'runAsync', // асинхронно
}

engine.run(delta);                           // DEFAULT (sync)
await engine.run(delta, EngineMode.SUCCESSIVE); // последовательно async
await engine.run(delta, EngineMode.PARALLEL);   // параллельно async
```

---

### AbstractEntitySystem — удобная обёртка

```ts
// Структура AbstractEntitySystem
export abstract class AbstractEntitySystem<T extends AbstractEntity = AbstractEntity>
  extends System
  implements AspectListener    // ← система САМА является слушателем Aspect
{
  protected aspect: Aspect | null = null;

  constructor(
    public priority = 0,
    protected all?:     CompType[],  // CompType = ComponentClass | Component instance
    protected exclude?: CompType[],
    protected one?:     CompType[]
  ) {
    super(priority);
  }

  // Вызывается автоматически, когда система добавлена в Engine
  onAddedToEngine(engine: Engine): void {
    // Создаём Aspect и подписываемся на него
    this.aspect = Aspect.for(engine, this.all, this.exclude, this.one);
    this.aspect.addListener(this);  // this = система — это и есть AspectListener
  }

  // Вызывается автоматически, когда система удалена из Engine
  onRemovedFromEngine(): void {
    if (!this.aspect) return;
    this.aspect.removeListener(this);
    this.aspect.detach();  // отключаемся от engine
    this.aspect = null;
  }

  // ── Реализация AspectListener ──────────────────────────────────────

  // Новые entity вошли в Aspect (получили нужные компоненты)
  onAddedEntities(...entities: AbstractEntity[]): void {}

  // Entity вышли из Aspect (потеряли компонент или удалены)
  onRemovedEntities?(...entities: AbstractEntity[]): void {}

  onClearedEntities?(): void {}
  onSortedEntities?(): void {}

  // Компоненты изменились у entity, которая УЖЕ в Aspect
  onAddedComponents?(entity: AbstractEntity, ...components: Component[]): void {}
  onRemovedComponents?(entity: AbstractEntity, ...components: Component[]): void {}
  onClearedComponents?(entity: AbstractEntity): void {}
  onSortedComponents?(entity: AbstractEntity): void {}

  // ── Встроенный process() ──────────────────────────────────────────

  // process() уже реализован! Ты переопределяешь только processEntity()
  process<U>(options?: U): void {
    // Берёт entity из Aspect (или из всего engine, если Aspect нет)
    const entities = this.aspect
      ? this.aspect.entities
      : this._engine?.entities.elements;

    if (!entities?.length) return;

    for (let i = 0; i < entities.length; i++) {
      this.processEntity(entities[i] as T, i, entities as T[], options);
    }
  }

  // Твой основной метод — обработка одной entity
  abstract processEntity<U>(entity: T, index?: number, entities?: T[], options?: U): void;
}
```

### Как писать систему — два способа

**Способ 1: Через `System` напрямую (полный контроль)**

```ts
class MovementSystem extends System {
  private aspect: Aspect;

  // Создаём Aspect вручную когда получаем движок
  onAddedToEngine(engine: Engine): void {
    this.aspect = Aspect.for(engine).all(Position, Velocity);

    // Можем подписаться на события Aspect
    this.aspect.addListener({
      onAddedEntities(...entities) {
        console.log('Новые движущиеся entity:', entities.length);
      },
      onRemovedEntities(...entities) {
        console.log('Entity перестали двигаться:', entities.length);
      }
    });
  }

  onRemovedFromEngine(): void {
    this.aspect?.detach();
  }

  process(delta: number): void {
    for (const entity of this.aspect.entities) {
      const pos = entity.components.get(Position)!;
      const vel = entity.components.get(Velocity)!;
      pos.x += vel.dx * delta;
      pos.y += vel.dy * delta;
    }
  }
}
```

**Способ 2: Через `AbstractEntitySystem` (удобно)**

```ts
class MovementSystem extends AbstractEntitySystem<MyEntity> {
  constructor() {
    // priority=0, all=[Position, Velocity], exclude=[], one=[]
    super(0, [Position, Velocity]);
  }

  // Вызывается когда entity ПОЯВЛЯЕТСЯ в Aspect (получила Position + Velocity)
  onAddedEntities(...entities: MyEntity[]): void {
    for (const e of entities) {
      console.log(`Entity ${e.id} начала двигаться`);
    }
  }

  // Вызывается когда entity ПОКИДАЕТ Aspect
  onRemovedEntities(...entities: MyEntity[]): void {
    for (const e of entities) {
      console.log(`Entity ${e.id} остановилась`);
    }
  }

  // Основной метод — вызывается каждый кадр для каждой entity из Aspect
  processEntity(entity: MyEntity, index: number, entities: MyEntity[], delta: number): void {
    const pos = entity.components.get(Position)!;
    const vel = entity.components.get(Velocity)!;
    pos.x += vel.dx * delta;
    pos.y += vel.dy * delta;
  }
}
```

---

## 8. Engine

**Файл:** `engine.ts`

### EngineListener

```ts
export interface EngineListener<T extends AbstractEntity = AbstractEntity> {
  // Системы
  onAddedSystems?(...systems: System[]): void;
  onRemovedSystems?(...systems: System[]): void;
  onClearedSystems?(): void;
  onErrorBySystem?(error: Error, system: System): void;  // ошибка в системе

  // Entity
  onAddedEntities?(...entities: T[]): void;
  onRemovedEntities?(...entities: AbstractEntity[]): void;
  onClearedEntities?(): void;
}
```

### Engine — что происходит внутри

```ts
export class Engine<T extends AbstractEntity = AbstractEntity>
  extends Dispatcher<EngineListener>
{
  protected _systems  = new Collection<System>();
  protected _entities = new EntityCollection<T>();
  protected _activeSystems: System[] = [];

  constructor() {
    super();

    // ── Слушаем _systems ──────────────────────────────────────────────
    // lock=true → этот listener нельзя снять извне
    this._systems.addListener({

      onAdded: (...systems: System[]) => {
        // Сортируем по priority (меньше = раньше выполняется)
        this._systems.sort((a, b) => a.priority - b.priority);

        systems.forEach(system => {
          // Это присваивание запускает lifecycle system:
          // → system.onRemovedFromEngine(oldEngine) если была в другом engine
          // → system.onAddedToEngine(this)
          system.engine = this;

          // Обновляем кеш активных систем
          this.updatedActiveSystems();

          // Слушаем изменения active/error системы
          const internalListener = {
            onActivated:   () => this.updatedActiveSystems(),
            onDeactivated: () => this.updatedActiveSystems(),
            onError: (error: Error) => this.dispatch('onErrorBySystem', error, system),
          };

          // lock=true — этот listener закрытый, его нельзя снять снаружи
          system.addListener(internalListener, true);
        });

        this.dispatch('onAddedSystems', ...systems);
      },

      onRemoved: (...systems: System[]) => {
        systems.forEach(system => {
          system.engine = null;  // → onRemovedFromEngine() в системе
          this.updatedActiveSystems();
          // Удаляем внутренний listener (он был locked, но мы знаем как его убрать)
        });
        this.dispatch('onRemovedSystems', ...systems);
      },

      onCleared: () => this.dispatch('onClearedSystems'),

    }, true); // lock=true

    // ── Слушаем _entities ─────────────────────────────────────────────
    this._entities.addListener({
      onAdded:   (...entities: T[]) => this.dispatch('onAddedEntities', ...entities),
      onRemoved: (...entities: T[]) => this.dispatch('onRemovedEntities', ...entities),
      onCleared: ()                 => this.dispatch('onClearedEntities'),
    }, true); // lock=true
  }

  get entities(): EntityCollection<T> { return this._entities; }
  get systems():  Collection<System>  { return this._systems; }
  get activeSystems(): readonly System[] { return this._activeSystems; }

  protected updatedActiveSystems(): void {
    // Кеш активных систем обновляется при каждом изменении active
    this._activeSystems = this.systems.filter(s => s.active);
    Object.freeze(this._activeSystems);  // неизменяемый снаружи
  }

  // Запуск
  run<U>(options?: U, mode: EngineMode = EngineMode.DEFAULT): void | Promise<void> {
    return this[mode].call(this, options);
  }

  protected runDefault<U>(options?: U): void {
    for (const system of this._activeSystems) {
      system.run(options, SystemMode.SYNC);
    }
  }

  protected async runSuccessive<U>(options?: U): Promise<void> {
    for (const system of this._activeSystems) {
      await system.run(options, SystemMode.SYNC);
    }
  }

  protected async runParallel<U>(options?: U): Promise<void> {
    await Promise.all(this._activeSystems.map(s => s.run(options, SystemMode.ASYNC)));
  }
}
```

### Важный нюанс: priority и порядок

При добавлении системы в Engine, коллекция систем **сразу сортируется** по `priority`. Чем меньше число — тем раньше система выполняется.

```ts
engine.systems.add(new RenderSystem(10));   // выполнится последней
engine.systems.add(new GravitySystem(0));   // выполнится первой
engine.systems.add(new MovementSystem(1));  // вторая
// Реальный порядок: Gravity(0) → Movement(1) → Render(10)
```

### Как добавить сущности

В ecsts сущности добавляются напрямую в `engine.entities`:

```ts
const entity = new MyEntity();
entity.components.add(new Position(100, 200));
entity.components.add(new Velocity(5, 0));

engine.entities.add(entity);  // теперь Aspect-ы увидят эту entity
```

Обрати внимание: компоненты можно добавлять **до или после** добавления entity в engine. Если entity добавлена в engine — Aspect проверит её. Если ты добавишь компонент позже — entity-слушатель уведомит Aspect, и он пересчитает.

---

## 9. Полная карта событий

### Цепочка при добавлении системы

```
engine.systems.add(mySystem)
    │
    ▼
Collection.dispatch('onAdded', mySystem)
    │
    ▼ (Engine's locked listener на _systems)
mySystem.engine = engine
    │
    ├── mySystem.onRemovedFromEngine(oldEngine)  ← если был в другом engine
    │   └── mySystem.dispatch('onRemovedFromEngine', oldEngine)
    │
    └── mySystem.onAddedToEngine(engine)          ← ГЛАВНЫЙ LIFECYCLE ХУУК
        └── mySystem.dispatch('onAddedToEngine', engine)
                │
                ▼ (если AbstractEntitySystem)
         Aspect.for(engine, all, exclude, one)  ← создаётся Aspect
         aspect.addListener(mySystem)            ← система слушает Aspect
```

### Цепочка при добавлении entity + компонента

```
engine.entities.add(entity)
    │
    ▼
EntityCollection.dispatch('onAdded', entity)
    │
    ├── Engine.dispatch('onAddedEntities', entity)  → EngineListener
    │
    └── Aspect (подписан на EntityCollection)
        → checkAndUpdate(entity)
        → entity не имеет нужных компонентов → не попадает в Aspect


entity.components.add(new Position(10, 20))
    │
    ▼
ComponentCollection.dispatch('onAdded', position)
    │
    ▼ (entity подписана на свой ComponentCollection)
entity.onAdded(position)
    │
    ▼
entity.dispatch('onAddedComponents', position)
    │
    ├── EntityListener(s) → пользовательский код
    │
    └── Aspect (подписан на эту entity)
        → checkAndUpdate(entity)
        → у entity есть Position, но нет Velocity → не попадает


entity.components.add(new Velocity(1, 0))
    │
    (та же цепочка...)
    │
    └── Aspect.checkAndUpdate(entity)
        → есть Position И Velocity → ПОПАДАЕТ в Aspect!
        → aspect._entities.push(entity)
        → aspect.dispatch('onAddedEntities', entity)
                │
                ▼ (если AbstractEntitySystem слушает Aspect)
         mySystem.onAddedEntities(entity)  ← ВЫЗЫВАЕТСЯ!
```

### Цепочка при удалении системы

```
engine.systems.remove(mySystem)
    │
    ▼
Collection.dispatch('onRemoved', mySystem)
    │
    ▼ (Engine's locked listener)
mySystem.engine = null
    │
    ├── mySystem.onRemovedFromEngine(engine)  ← ВЫЗЫВАЕТСЯ
    │       │
    │       ▼ (если AbstractEntitySystem)
    │   aspect.removeListener(mySystem)
    │   aspect.detach()  ← отписываемся от engine и entity
    │
    └── mySystem.dispatch('onRemovedFromEngine', engine)
            │
            ▼
     SystemListener(s) → пользовательский код
```

### Полная таблица событий по классам

| Класс | Listener Interface | Методы |
|---|---|---|
| Entity | `EntityListener` | `onAddedComponents`, `onRemovedComponents`, `onClearedComponents`, `onSortedComponents` |
| Collection | `CollectionListener` | `onAdded`, `onRemoved`, `onCleared`, `onSorted` |
| Aspect | `AspectListener` | `onAddedEntities`, `onRemovedEntities`, `onClearedEntities`, `onSortedEntities`, `onAddedComponents(entity, ...)`, `onRemovedComponents(entity, ...)`, `onClearedComponents(entity)`, `onSortedComponents(entity)` |
| System | `SystemListener` | `onActivated`, `onDeactivated`, `onAddedToEngine`, `onRemovedFromEngine`, `onError` |
| Engine | `EngineListener` | `onAddedSystems`, `onRemovedSystems`, `onClearedSystems`, `onErrorBySystem`, `onAddedEntities`, `onRemovedEntities`, `onClearedEntities` |

---

## 10. Ключевое отличие ecsts от других ECS

Это самое важное, что нужно понять, прежде чем писать свою реализацию.

### В большинстве ECS — компоненты в глобальном хранилище

```ts
// Типичный ECS (Unity DOTS, bevy, EnTT)
world.add(entity, new Position(10, 20));  // Position хранится в мире
const pos = world.get(entity, Position);  // мир отдаёт компонент
```

### В ecsts — компоненты на сущности

```ts
// ecsts
entity.components.add(new Position(10, 20));  // Position хранится НА entity
const pos = entity.components.get(Position);   // entity отдаёт компонент
```

### Что это означает архитектурно

| Аспект | Глобальное хранилище | ecsts (на entity) |
|---|---|---|
| Доступ к компоненту | `world.get(entity, Position)` | `entity.components.get(Position)` |
| Хранение | Sparse Set / Archetype | Массив на объекте |
| Cache locality | Отличная | Хуже (разброс объектов) |
| Простота | Сложнее реализовать | Проще, понятнее |
| События | Глобальные | Локальные (на entity) + Aspect |
| Entity — это | Просто number | Объект с компонентами и ID |

ecsts выбирает простоту и богатую событийную модель в обмен на максимальную производительность. Это отличный учебный пример именно потому, что код очень читаем.

---

## 11. Полный пример

```ts
import {
  AbstractEntity,
  AbstractEntitySystem,
  Engine,
  Component,
} from '@trixt0r/ecs';

// ── Компоненты ─────────────────────────────────────────────────────────────

class Position implements Component {
  constructor(public x = 0, public y = 0) {}
}

class Velocity implements Component {
  constructor(public dx = 0, public dy = 0) {}
}

class Health implements Component {
  constructor(public current = 100, public max = 100) {}
}

class Frozen implements Component {}   // Tag

// ── Entity ─────────────────────────────────────────────────────────────────

let _id = 0;
class GameEntity extends AbstractEntity {
  constructor() { super(_id++); }
}

// ── Системы ────────────────────────────────────────────────────────────────

// Система движения: обрабатывает entity с Position + Velocity, но без Frozen
class MovementSystem extends AbstractEntitySystem<GameEntity> {
  constructor() {
    super(
      1,               // priority
      [Position, Velocity],  // all: нужны оба
      [Frozen],              // exclude: без тега Frozen
    );
  }

  // Вызывается когда entity ВПЕРВЫЕ попала в Aspect (получила нужные компоненты)
  onAddedEntities(...entities: GameEntity[]): void {
    for (const e of entities) {
      console.log(`[MovementSystem] Entity ${e.id} начала двигаться`);
    }
  }

  // Вызывается когда entity ПОКИНУЛА Aspect
  onRemovedEntities(...entities: GameEntity[]): void {
    for (const e of entities) {
      console.log(`[MovementSystem] Entity ${e.id} остановилась`);
    }
  }

  // Основная логика — вызывается каждый кадр
  processEntity(entity: GameEntity, _i: number, _all: GameEntity[], delta: number): void {
    const pos = entity.components.get(Position)!;
    const vel = entity.components.get(Velocity)!;
    pos.x += vel.dx * delta;
    pos.y += vel.dy * delta;
  }
}

// Система заморозки: через 3 секунды размораживает
class FreezeSystem extends AbstractEntitySystem<GameEntity> {
  private timers = new Map<number, number>();

  constructor() {
    super(2, [Frozen]);  // обрабатываем только замороженных
  }

  onAddedEntities(...entities: GameEntity[]): void {
    for (const e of entities) {
      this.timers.set(e.id as number, 3);  // таймер 3 секунды
      console.log(`[FreezeSystem] Entity ${e.id} заморожена на 3 сек`);
    }
  }

  onRemovedEntities(...entities: GameEntity[]): void {
    for (const e of entities) {
      this.timers.delete(e.id as number);
    }
  }

  processEntity(entity: GameEntity, _i: number, _all: GameEntity[], delta: number): void {
    const id      = entity.id as number;
    const timer   = (this.timers.get(id) ?? 3) - delta;
    this.timers.set(id, timer);
    if (timer <= 0) {
      entity.components.remove(Frozen);  // размораживаем
    }
  }
}

// ── Сборка ─────────────────────────────────────────────────────────────────

const engine = new Engine<GameEntity>();

// Слушаем движок
engine.addListener({
  onAddedEntities(...entities) {
    console.log(`[Engine] +${entities.length} entity`);
  },
  onAddedSystems(...systems) {
    console.log(`[Engine] +система: ${systems.map(s => s.constructor.name).join(', ')}`);
  },
  onErrorBySystem(error, system) {
    console.error(`[Engine] Ошибка в ${system.constructor.name}:`, error);
  }
});

engine.systems.add(new MovementSystem());
engine.systems.add(new FreezeSystem());

// Создаём игрока
const player = new GameEntity();
engine.entities.add(player);

// Добавляем компоненты ПОСЛЕ добавления в движок
// Aspect автоматически обнаружит их
player.components.add(new Position(0, 0));
player.components.add(new Velocity(100, 0));

// Замораживаем через секунду
setTimeout(() => {
  console.log('Замораживаем игрока');
  player.components.add(new Frozen());
  // MovementSystem.onRemovedEntities(player) ← вызовется
  // FreezeSystem.onAddedEntities(player)     ← вызовется
}, 1000);

// Игровой цикл
let last = Date.now();
function loop() {
  const now = Date.now();
  const dt  = (now - last) / 1000;
  last = now;

  engine.run(dt);  // запускает все системы

  setTimeout(loop, 16);  // ~60fps
}
loop();
```

---

## 12. Пошаговый план своей реализации

Если хочешь написать библиотеку по образцу ecsts — вот порядок:

### Шаг 1 — `types.ts`
```ts
// Тип для конструктора компонента
export type ComponentClass<T> = new (...args: any[]) => T;
// Вспомогательный тип для аргументов функции
export type ArgumentTypes<F> = F extends (...args: infer A) => any ? A : never;
```

### Шаг 2 — `dispatcher.ts`
Самый простой файл. Массив listeners + метод dispatch. Сделай его правильно — всё остальное будет опираться на него.

Ключевые решения:
- `Partial<T>` — слушатель реализует интерфейс частично
- `lock` — защита от удаления системных слушателей
- `dispatch` — проходит по listeners, вызывает метод по имени

### Шаг 3 — `collection.ts`
Dispatcher с массивом + `CollectionListener` (onAdded/onRemoved/onCleared/onSorted).

### Шаг 4 — `component.ts`
Пустой интерфейс `Component` + `ComponentCollection extends Collection` с методом `get(ctor)`.

### Шаг 5 — `entity.ts`
`AbstractEntity extends Dispatcher<EntityListener> implements CollectionListener`.
Конструктор создаёт `_components` и подписывается на него. Методы onAdded/onRemoved перенаправляют в диспатч.

### Шаг 6 — `entity.collection.ts`
Просто `EntityCollection extends Collection<AbstractEntity>`, возможно с дополнительными методами фильтрации.

### Шаг 7 — `aspect.ts` ← самый сложный
- Хранит `_entities: AbstractEntity[]`
- Три фильтра: `allTypes`, `excludeTypes`, `oneTypes`
- `attach(engine)`: подписывается на EntityCollection движка и на каждую существующую entity
- `checkAndUpdate(entity)`: вызывает `matches()`, добавляет/удаляет из `_entities`, диспатчит события
- Нужно правильно управлять подпиской/отпиской от entity при их добавлении/удалении из engine
- `detach()`: отписывается от всего

### Шаг 8 — `system.ts`
- `System extends Dispatcher<SystemListener>` — `active`, `engine` (setters с событиями), `run()`, `runSync()`, `runAsync()`
- `AbstractEntitySystem extends System implements AspectListener` — создаёт Aspect в `onAddedToEngine`, итерирует в `process()`

### Шаг 9 — `engine.ts`
- `Engine extends Dispatcher<EngineListener>`
- В конструкторе: подписывается на `_systems` и `_entities` через locked listeners
- `_systems.onAdded`: сортирует, устанавливает `system.engine = this`, обновляет `_activeSystems`
- `run(options, mode)`: вызывает `runDefault/runSuccessive/runParallel`

---

## Итоговая архитектурная схема

```
                    ┌──────────────────────────────┐
                    │           Engine              │
                    │                              │
                    │  _systems: Collection        │
                    │  _entities: EntityCollection  │
                    │  _activeSystems: System[]    │
                    │                              │
                    │  run(delta, mode?)            │
                    └──────────────┬───────────────┘
                          ┌────────┴────────┐
                          ▼                 ▼
              ┌───────────────────┐   ┌──────────────────┐
              │     System[]      │   │   Entity[]        │
              │                  │   │                  │
              │ priority          │   │  id               │
              │ active            │   │  components:      │
              │ engine            │   │  ComponentColl.   │
              │                  │   │  ├─ Position       │
              │ onAddedToEngine() │   │  ├─ Velocity       │
              │ process()         │   │  └─ Health         │
              └─────────┬─────────┘   └──────────────────┘
                        │                      ▲
                        │ создаёт              │ слушает
                        ▼                      │
              ┌──────────────────────────────────────────┐
              │                 Aspect                    │
              │                                          │
              │  allTypes:     [Position, Velocity]       │
              │  excludeTypes: [Frozen]                   │
              │  oneTypes:     []                         │
              │                                          │
              │  entities: [entity1, entity3, entity7]   │
              │  (обновляется автоматически)             │
              │                                          │
              │  addListener(system)  ← система слушает  │
              └──────────────────────────────────────────┘

При entity.components.add(velocity):
  ComponentCollection → Entity → Aspect.checkAndUpdate()
    → entity в Aspect?  да → system.onAddedEntities(entity)
    → entity не в Aspect? нет → ничего
```

---

*Главный инсайт ecsts: всё построено на цепочке Dispatcher-ов. Entity слушает ComponentCollection. Engine слушает EntityCollection и SystemCollection. Aspect слушает и Entity, и EntityCollection. Система слушает Aspect. Это элегантная реактивная система без единого глобального EventBus.*
