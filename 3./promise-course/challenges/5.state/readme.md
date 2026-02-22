CustomPromise.js
В этом испытании вы познакомитесь с автоматным программированием.

Реализуйте в классе CustomPromise метод then(callback) и вызов обработчиков на основе состояния объекта. Состояния запишите в объект STATES и используйте его вместо текстовых значений.

Алгоритм
Для решения данной задачи вам уже понадобится "подглядывать" в стандарт

https://www.ecma-international.org/ecma-262/6.0/#sec-properties-of-promise-instances

чтобы разобраться с неймингом и общим алгоритмом. В нём указаны состояния, между которыми совершаются переходы, начальное состояние объекта и "реакции" (функции) на изменение состояния.

Достаточно будет одного состояния - его установки и очистки, чтобы не усложнять реализацию. На изменение состояния должна происходить реакция, а если объект находится в начальном состоянии, то реакции должны накапливаться.

Для упрощения можно копировать решение учителя из предыдущего испытания и расширять его. В решении должны отсутствовать встроенные Promise и ключевое слово async. Только вызовы функций из функций.

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
Изучите кейсы использования в тестах, они опираются на возможности промисов из документации
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

Если почувствуете, что нужны дополнительные материалы:

описание стандарта, который имплементируется в упражнении
https://262.ecma-international.org/13.0/#sec-properties-of-promise-instances
