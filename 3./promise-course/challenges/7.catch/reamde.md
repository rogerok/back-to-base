CustomPromise.js
В данном испытании вы реализуете собственную версию объекта Promise.

Реализуйте в классе CustomPromise конструктор, принимающий колбек executor(resolve, reject), методы then(onFulfill, onReject) и catch(onReject), и обеспечьте корректный перехват ошибок с передачей в соответствующие обработчики.

Алгоритм
Обработчик reject(data) экзекьютора вызывается только при выбросе ошибки.

В решении должны отсутствовать встроенные Promise и ключевое слово async. Только таймеры и вызовы функций из функций.

Примеры использования

```ts
import CustomPromise from "../CustomPromise.js";

const resolvedPromise = new CustomPromise((resolve) => resolve("Hello, world!"));
resolvedPromise
  .then((value) => {
    console.log(value); // 'Hello, world!'
    throw new Error("Goodbye, world!");
  })
  .catch((err) => console.error(err)); // 'Error: Goodbye, world!'

const rejectedPromise = new CustomPromise((_, reject) => reject("Hello, world!"));
const result = await rejectedPromise
  .catch((rejectMessage) => rejectMessage.split(" "))
  .then(([firstWord]) => firstWord + " Pepe!");
console.log(result); // Hello, Pepe!
```

Подсказки
Изучите кейсы использования в тестах, они опираются на возможности промисов из документации.

Если почувствуете, что нужны дополнительные материалы:

описание стандарта https://www.262.ecma-international.org/6.0/index.html#sec-properties-of-promise-instances, который имплементируется в упражнении
курс "Синхронная асинхронность", чуть глубже погружающий в тему
курс "Автоматное программирование" о конечных автоматах, чем является промис
