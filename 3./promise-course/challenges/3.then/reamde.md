CustomPromise.js
Серия испытаний CustomPromise затрагивает множество тем, тесно связана со стандартом ecma и будет полезна для прокачки опытным разработчикам. Если тема классов и позднего связывания вам пока плохо знакомы, то продолжайте обучение и возвращайтесь к этим испытаниям позже.

В данном испытании вы собственными силами начнёте реализовывать "облегчённую" версию объекта Promise. Последующие испытания будут раскрывать тему и дополнять её новой функциональностью.

В данном испытании необходимо создать только класс, без асинхронности, но с цепочкой вызовов. Для этого реализуйте в классе CustomPromise конструктор, принимающий колбек executor(resolve), а также метод then(callback);

В решении должны отсутствовать встроенные Promise и ключевое слово async.

Примеры использования

```ts
import CustomPromise from "../CustomPromise.js";

const promise = new CustomPromise((resolve) => resolve("Hello, world!"));
promise.then((value) => {
  console.log(value); // 'Hello, world!'
});

const result = await promise
  .then((value) => value.replace("Hello", "Goodbye"))
  .then((value) => value.toUpperCase());
console.log(result); // GOODBYE, WORLD!
```

Подсказки
Вам понадобится вспомогательный метод, чтобы замыкать значения.

Изучите кейсы использования в тестах, они опираются на возможности промисов из документации.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

В решении учителя используется связывание через bind(), но в процессе решения можно упростить себе задачу, используя стрелочные функции.
