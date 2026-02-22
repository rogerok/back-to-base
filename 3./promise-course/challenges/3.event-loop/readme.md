CustomPromise.js
В данном испытании вы реализуете собственную версию объекта Promise.

Необходимо создать класс CustomPromise с цепочкой вызовов. В классе реализуйте метод then(onFulfill) и обеспечьте асинхронное выполнение функции resolve(data).

Алгоритм
Используйте названия состояний из стандарта https://www.ecma-international.org/ecma-262/6.0/#sec-properties-of-promise-instances

, так как они проверяются в тестах.

В решении должны отсутствовать встроенные Promise и ключевое слово async. Только таймеры и вызовы функций из функций.

```ts
import CustomPromise from "../CustomPromise.js";

const messages = [];

const resolvedPromise = new CustomPromise((resolve) => {
  resolve("Сначала резолвим?");
});

const modifiedPromise = resolvedPromise.then(() => {
  messages.push("Сначала меняем статус.");
});

await modifiedPromise.then(() => {
  messages.push("А уже потом резолвим.");
});

console.log(messages.join(" ")); // Сначала меняем статус. А уже потом резолвим.
```

Подсказки
Изучите кейсы использования в тестах, они опираются на возможности промисов из документации.

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
