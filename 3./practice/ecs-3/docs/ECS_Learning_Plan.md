# ECS — План обучения без готового кода

> Этот документ не даёт тебе ответов. Он задаёт вопросы и показывает, где искать.
> Твоя задача — **прийти к ответу самому**, используя подсказки и ссылки на исходники.
>
> Когда застрянешь — не гугли готовое решение. Перечитай вопрос. Открой ссылку на исходник.
> Попробуй объяснить проблему вслух (rubber duck debugging).

---

## Как работать с этим документом

Каждый блок устроен так:

```
🎯 Задача        — что нужно понять или реализовать
❓ Вопросы       — думай над ними ДО того, как смотреть исходник
🔍 Смотри здесь  — ссылка на конкретный файл в ecsts
💡 Намёк         — подсказка если совсем застрял (читай в последнюю очередь)
✅ Критерий      — как понять, что ты разобрался
```

---

## Модуль 0. Прочитай README и запусти пример

Прежде чем писать код — **запусти чужой**.

🎯 **Задача:** клонируй репозиторий, запусти пример с прямоугольниками, посмотри как это работает.

```
git clone https://github.com/Trixt0r/ecsts.git
cd ecsts/examples/rectangles
# открой index.html в браузере или разберись как запустить
```

❓ **Вопросы для наблюдения:**
- Что происходит на экране?
- Сколько сущностей ты видишь?
- Можешь ли ты на глаз угадать, какие системы там есть?

🔍 **Смотри:** `examples/rectangles/` — найди там точку входа и проследи что создаётся.

✅ **Критерий:** ты можешь своими словами описать что происходит в примере, не глядя в код.

---

## Модуль 1. Dispatcher — с чего всё начинается

### 1.1 Зачем вообще нужен Dispatcher?

🎯 **Задача:** понять проблему, которую решает Dispatcher, до того как смотреть реализацию.

❓ **Вопросы:**
- Представь: у тебя есть класс `Engine`. Когда добавляется новая система, ты хочешь уведомить «кого-то снаружи». Как бы ты это сделал без Dispatcher? Запиши три варианта.
- Что плохого в варианте «сохранить один callback»?
- Что плохого в варианте «использовать глобальный EventEmitter»?
- Что если слушателей несколько, и каждый хочет реагировать на разные события?

💡 **Намёк:** Dispatcher — это обобщённый Observer pattern. Ключевое слово здесь — **обобщённый**. Как сделать так, чтобы один класс мог работать с *любым* интерфейсом слушателя?

### 1.2 Изучи реализацию

🔍 **Смотри:** [`src/core/dispatcher.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/dispatcher.ts)

❓ **Вопросы после чтения:**
- Почему listeners типизированы как `Partial<T>`, а не просто `T`?
- Что делает `fn.apply(listener, args)` — чем это отличается от `fn(...args)`? (Подсказка: погугли разницу между `call`, `apply` и обычным вызовом. Ключевое слово — `this`.)
- Зачем нужны `_lockedListeners`? Придумай сценарий, где это необходимо.
- Метод `dispatch` не типобезопасен в рантайме — почему? Это проблема?

### 1.3 Напиши свой Dispatcher

🎯 **Задача:** реализуй Dispatcher с нуля. Не подглядывай в исходник — только в вопросы выше.

Начни с этих требований и **придумай остальные сам**:
- Хранит список слушателей произвольного интерфейса
- Умеет добавлять и удалять слушателей
- Умеет вызывать метод по имени у всех слушателей

✅ **Критерий:** ты можешь написать тест — создать Dispatcher, добавить двух слушателей с разными методами, вызвать dispatch, и убедиться что оба получили вызов.

---

## Модуль 2. Collection — массив с памятью

### 2.1 Зачем нужен не просто массив?

❓ **Вопросы:**
- Что произойдёт, если кто-то добавит систему в `engine.systems`, и движок об этом не узнает?
- Как сделать так, чтобы любое изменение массива автоматически уведомляло подписчиков?
- Почему не использовать стандартный `EventEmitter` из Node.js?

### 2.2 Изучи реализацию

🔍 **Смотри:** [`src/core/collection.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/collection.ts)

❓ **Вопросы после чтения:**
- `Collection` наследует `Dispatcher` — значит она сама является диспатчером. Кого она уведомляет?
- `CollectionListener` имеет 4 метода. Попробуй угадать ДО чтения — какие 4 операции с массивом важны для ECS?
- Почему `elements` возвращается как `readonly`?

💡 **Намёк:** Посмотри как `Collection` используется внутри `Engine` — там есть два экземпляра Collection. Что в них хранится?

✅ **Критерий:** ты можешь нарисовать на бумаге: «когда кто-то вызывает `collection.add(x)` — что происходит дальше по цепочке».

---

## Модуль 3. Component и Entity — данные и контейнер

### 3.1 Главный вопрос архитектуры

❓ **Вопрос-ловушка (думай долго):**

В большинстве ECS-библиотек (Unity DOTS, bevy, EnTT) компоненты хранятся в **глобальном хранилище движка**, и entity — это просто число (ID).

В ecsts компоненты хранятся **на самой entity** — `entity.components`.

Это принципиальное архитектурное решение. Прежде чем смотреть в код — подумай:
- Какие **преимущества** даёт подход ecsts?
- Какие **недостатки**? (Подсказка: погугли "cache locality" и "data-oriented design")
- Почему для учебной библиотеки подход ecsts лучше?
- Что бы ты выбрал для игры с 100 000 entity?

### 3.2 Изучи Component

🔍 **Смотри:** [`src/core/component.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/component.ts)

❓ **Вопросы:**
- Интерфейс `Component` — пустой. Зачем он вообще нужен, если он ничего не требует?
- `ComponentCollection` наследует `Collection<Component>`. Какой метод ей нужно добавить, которого нет в базовом Collection? (Подсказка: системам нужно получать компонент **по типу**)

💡 **Намёк:** `entity.components.get(Position)` — что тут передаётся в `get`? Это экземпляр или класс? Как TypeScript это типизирует?

### 3.3 Изучи Entity

🔍 **Смотри:** [`src/core/entity.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/entity.ts)

❓ **Вопросы:**
- `AbstractEntity extends Dispatcher<EntityListener>` И `implements CollectionListener<C>`. Это два разных паттерна применяются одновременно. Зачем?
- В конструкторе: `this._components.addListener(this, true)`. `this` добавляет себя как слушателя своей же коллекции. Зачем? Что произойдёт при добавлении компонента?
- `lock=true` — почему entity не должна уметь снять себя как слушателя своих компонентов?
- `AbstractEntity` — **абстрактный** класс. Почему? Что ты должен предоставить сам?

🎯 **Практическое задание:**
Нарисуй на бумаге цепочку вызовов для:
```
entity.components.add(new Position(10, 20))
```
Что вызывается? В каком порядке? Кто кого уведомляет?

✅ **Критерий:** ты можешь объяснить всю цепочку не глядя в код.

---

## Модуль 4. Aspect — живая выборка

Это самый сложный модуль. Не торопись.

### 4.1 Сформулируй проблему

❓ **Вопросы (думай, не читай код):**
- У тебя тысячи entity. Системе `MovementSystem` нужны только те, у которых есть `Position` и `Velocity`. Как бы ты это сделал наивно (без Aspect)?
- Почему этот наивный способ плох? (Подсказка: O(n) каждый кадр)
- Какую структуру данных нужно поддерживать, чтобы получить список нужных entity мгновенно?
- Когда эта структура должна обновляться?

### 4.2 Изучи Aspect

🔍 **Смотри:** [`src/core/aspect.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/aspect.ts)

❓ **Вопросы после чтения:**
- `Aspect.for(engine, all?, exclude?, one?)` — статический factory метод. Почему не `new Aspect(engine, ...)`? Это просто удобство или есть причина?
- Три фильтра: `all`, `exclude`, `one`. Попробуй придумать игровой сценарий для каждого из них.
- Aspect подписывается на два источника событий. На какие? Зачем оба?
- Метод `detach()` — когда он вызывается? Что случится если его не вызвать?

❓ **Самый важный вопрос:**
- Entity добавлена в движок, но у неё ещё нет компонентов. Потом добавляется `Position`, потом `Velocity`. Aspect ждёт обоих. Нарисуй на бумаге когда именно entity попадёт в Aspect.

💡 **Намёк:** найди в исходнике метод `checkAndUpdate` (или аналогичный). Он вызывается несколько раз. При каждом вызове он пересчитывает — подходит ли entity. Это и есть ответ.

### 4.3 Пойми AspectListener

🔍 **Смотри:** `AspectListener` интерфейс в том же файле

❓ **Вопросы:**
- `onAddedEntities` и `onRemovedEntities` — понятно. Но есть ещё `onAddedComponents(entity, ...components)`. Зачем? Когда он вызывается?
- Чем отличается: entity *вошла в Aspect* vs компонент *добавился у entity которая уже в Aspect*?

✅ **Критерий:** ты можешь нарисовать все сценарии, при которых entity появляется или исчезает из Aspect.

---

## Модуль 5. System — два уровня абстракции

### 5.1 Изучи базовый System

🔍 **Смотри:** [`src/core/system.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/system.ts) — только класс `System` (примерно первые 270 строк)

❓ **Вопросы:**
- `system.engine` — это **property с setter**. Что происходит при присваивании `system.engine = someEngine`? Именно в сеттере — не в методе.
- `system.active` — тоже property с setter. Что кроме флага меняется?
- `run(options, mode)` — есть `SYNC` и `ASYNC`. В чём разница для `process()`? Что происходит с `_updating` в async режиме?
- Зачем `_updating` вообще нужен? Придумай сценарий где это важно.
- `onError` — переопределяемый метод. Что произойдёт если его НЕ переопределить и в `process()` выбросится ошибка?

### 5.2 Изучи AbstractEntitySystem

🔍 **Смотри:** тот же файл, класс `AbstractEntitySystem` (строки ~269+)

❓ **Вопросы:**
- `AbstractEntitySystem implements AspectListener` — система **сама является** слушателем Aspect. Что это означает на практике?
- В `onAddedToEngine`: `this.aspect.addListener(this)` — `this` здесь это система. Какие методы системы будут вызываться как AspectListener?
- В `onRemovedFromEngine`: `aspect.detach()` + `aspect.removeListener(this)`. Порядок важен? Попробуй угадать что будет если поменять порядок.
- Метод `process()` уже реализован в `AbstractEntitySystem`. Ты переопределяешь только `processEntity()`. Открой `process()` — найди строки где он берёт entity. Что происходит если `this.aspect` равен `null`?

### 5.3 Напиши систему без AbstractEntitySystem

🎯 **Задача:** напиши `MovementSystem`, которая наследует `System` напрямую (не `AbstractEntitySystem`). Вручную создай Aspect в `onAddedToEngine`.

Это важно — понять что `AbstractEntitySystem` просто автоматизирует то, что ты можешь сделать руками.

✅ **Критерий:** система работает так же, как если бы использовала `AbstractEntitySystem`.

---

## Модуль 6. Engine — связующее звено

### 6.1 Думай до чтения

❓ **Вопросы (письменно, до чтения):**
- Engine должен знать когда система добавлена. Как он это узнаёт? (Подсказка: вернись к Collection)
- Когда `system.engine = this` — что запускается в системе?
- Почему Engine хранит `_activeSystems` отдельно от `_systems`? Когда они расходятся?
- `priority` — для чего? Кто отвечает за сортировку по priority?

### 6.2 Изучи Engine

🔍 **Смотри:** [`src/core/engine.ts`](https://github.com/Trixt0r/ecsts/blob/master/src/core/engine.ts)

❓ **Вопросы после чтения:**
- В конструкторе Engine добавляет слушателей на `_systems` и `_entities` с `lock=true`. Зачем lock? Что произошло бы без него?
- Найди строку `systems.forEach(system => { system.engine = this; ...`. Это присваивание вызывает цепочку. Опиши эту цепочку своими словами.
- `EngineMode.SUCCESSIVE` vs `EngineMode.PARALLEL` — придумай реальный сценарий когда нужен каждый.

### 6.3 Добавь сущность в движок

❓ **Эксперимент (письменно):**

Ты пишешь:
```ts
const entity = new MyEntity();
entity.components.add(new Position(10, 20));
entity.components.add(new Velocity(5, 0));
engine.entities.add(entity);
```

Vs:
```ts
const entity = new MyEntity();
engine.entities.add(entity);
entity.components.add(new Position(10, 20));
entity.components.add(new Velocity(5, 0));
```

Результат одинаковый? Почему? Проследи через Aspect — в какой момент entity попадёт в выборку в каждом случае.

✅ **Критерий:** ты можешь пройти весь путь от `engine.entities.add(entity)` до `system.processEntity(entity)` — каждый шаг — без подсказок.

---

## Модуль 7. Собери всё вместе

### 7.1 Финальное задание

🎯 **Задача:** реализуй минимальную ECS-библиотеку по образцу ecsts.

Правила:
1. Пишешь **без готового кода** из этого документа
2. Используешь ecsts как **референс** — смотри туда когда застрял
3. Называй файлы так же, реализуй те же интерфейсы

Порядок реализации (важен!):

```
1. types.ts         — ComponentClass, ArgumentTypes
2. dispatcher.ts    — Dispatcher<T>
3. collection.ts    — CollectionListener, Collection<T>
4. component.ts     — Component, ComponentCollection
5. entity.ts        — EntityListener, AbstractEntity
6. aspect.ts        — AspectListener, Aspect   ← самый сложный
7. system.ts        — SystemListener, System, AbstractEntitySystem
8. engine.ts        — EngineListener, Engine
```

### 7.2 Контрольные вопросы после каждого файла

После каждого файла задай себе:
- Могу ли я объяснить зачем этот класс существует?
- Какие события он генерирует и на какие подписывается?
- Что случится если его убрать?

### 7.3 Как проверить что реализация правильная

Запусти против своей реализации этот сценарий:

```ts
// Создай Engine
// Добавь MovementSystem (наследует AbstractEntitySystem, фильтр: Position+Velocity)
// Создай entity БЕЗ компонентов, добавь в engine
// Убедись: onAddedEntities НЕ вызван
// Добавь Position
// Убедись: onAddedEntities НЕ вызван
// Добавь Velocity
// Убедись: onAddedEntities ВЫЗВАН ← entity попала в Aspect
// Вызови engine.run(1/60) несколько раз
// Убедись: processEntity вызывается каждый run
// Удали Velocity у entity
// Убедись: onRemovedEntities ВЫЗВАН
// Убедись: processEntity больше не вызывается для этой entity
```

---

## Дополнительные вопросы для размышления

Когда основное готово — подумай над этим:

**О Dispatcher:**
- Что будет если один из listeners бросит исключение в `dispatch`? Остальные listeners получат вызов?
- Как оптимизировать `dispatch` если listeners много, но большинство не реализуют данный метод?

**О Aspect:**
- Что произойдёт с Aspect если entity добавляется в два разных Engine? (Подсказка: AbstractEntity не запрещает этого)
- Aspect хранит `entities` как массив. Почему не `Set`? Есть ли у массива преимущества для итерации?

**О System:**
- `system.priority` влияет на порядок. Что если двум системам нужны данные друг друга — система A читает то что записала система B? Как это решить через priority?
- `system.active = false` — система не выполняется. Но её Aspect продолжает обновляться? Проверь.

**О Engine:**
- Можно ли добавить одну систему в два Engine? Что произойдёт?

---

## Где искать ответы

| Тема | Где смотреть |
|---|---|
| Исходный код ecsts | [github.com/Trixt0r/ecsts/tree/master/src/core](https://github.com/Trixt0r/ecsts/tree/master/src/core) |
| Пример с прямоугольниками | [github.com/Trixt0r/ecsts/tree/master/examples/rectangles](https://github.com/Trixt0r/ecsts/tree/master/examples/rectangles) |
| Живой пример на StackBlitz | [stackblitz.com/edit/ecs-example-rectangles](https://stackblitz.com/edit/ecs-example-rectangles) |
| Observer pattern | [refactoring.guru/design-patterns/observer](https://refactoring.guru/design-patterns/observer) |
| TypeScript Generics | [typescriptlang.org/docs/handbook/2/generics.html](https://www.typescriptlang.org/docs/handbook/2/generics.html) |
| ECS FAQ (концепции) | [github.com/SanderMertens/ecs-faq](https://github.com/SanderMertens/ecs-faq) |
| `apply` vs `call` | [developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) |

---

## Правило одного вопроса

Когда застрял — **не гугли сразу**. Сначала:
1. Перефразируй вопрос своими словами
2. Открой исходник ecsts и найди место где это решается
3. Попробуй прочитать код и угадать почему именно так
4. Только если это не помогло — задай вопрос ментору или поищи

Это медленнее. Это и есть обучение.
