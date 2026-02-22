CustomPromise.js
В данном испытании вы реализуете собственную версию объекта Promise.

Реализуйте в классе CustomPromise конструктор, принимающий колбек executor(resolve, reject), методы then(onFulfill, onReject) и catch(onReject), и статические методы resolve(data) и reject(data). Добавьте в конструктор проверку типа параметра, используйте при выбросе ошибки сообщение из подготовленной константы. Все обработчики "по умолчанию" также необходимо добавить самостоятельно так, чтобы все проверки остались внутри объекта.

Алгоритм
Обратите внимание на использование thenable-объекта в тестах. Для него добавляется ещё одна проверка при разрешении промиса.

В решении должны отсутствовать встроенные Promise и ключевое слово async. Только таймеры и вызовы функций из функций.

Примеры использования

```ts
import CustomPromise from "../CustomPromise.js";

// Статические методы
const resolvedPromise = CustomPromise.resolve("Hello, world!");
resolvedPromise.then(console.log); // 'Hello, world!'

const rejectedPromise = CustomPromise.reject("Goodbye, world!");
rejectedPromise
  .then(console.log) //
  .catch(console.error); // 'Goodbye, world!'

// Методы экземпляра класса
const promise = new CustomPromise((resolve) => resolve("Hello, world!"));
promise
  .then((value) => {
    console.log(value); // 'Hello, world!'
    throw new Error("Goodbye, world!");
  })
  .catch((err) => console.error(err)); // 'Error: Goodbye, world!'
```

Подсказки
Изучите кейсы использования в тестах, они опираются на возможности промисов из документации.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

Если почувствуете, что нужны дополнительные материалы:

описание стандарта, который имплементируется в упражнении
https://www.262.ecma-international.org/6.0/index.html#sec-properties-of-promise-instances

курс "Синхронная асинхронность", чуть глубже погружающий в тему

курс "Автоматное программирование" о конечных автоматах, чем является промис
