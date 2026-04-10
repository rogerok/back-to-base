/**
 * Упражнение 1: Разминка — ap с Container
 * Сложность: начинающий
 *
 * Задача:
 *   Освоить механику ap: применить функцию внутри контейнера
 *   к значению внутри другого контейнера.
 *
 *   Ключевая идея:
 *     Container.of(fn).ap(Container.of(x))
 *     === Container.of(fn(x))
 *     === Container.of(x).map(fn)
 *
 *   Для каррированных функций ap вызывается цепочкой:
 *     Container.of(curriedFn).ap(Container.of(a)).ap(Container.of(b))
 *
 * Запуск:
 *   npx tsx exercise-1.ts
 */

import { Container, curry } from './containers.ts';

// ---------------------------------------------------------------------------
// Задание 1.1 — сложение двух значений через ap
//
// Напиши функцию addContainers(a, b), которая принимает ДВА Container
// с числами и возвращает Container с их суммой.
//
// Используй ТОЛЬКО ap (не доставай значения вручную через .value).
//
// Подсказка: сначала помести каррированный add в Container, затем .ap(a), затем .ap(b).
//
// Пример:
//   addContainers(Container.of(2), Container.of(3))  → Container(5)
//   addContainers(Container.of(10), Container.of(-4)) → Container(6)
// ---------------------------------------------------------------------------

const add = curry((a: number, b: number): number => a + b);

const addContainers = (a: Container<number>, b: Container<number>): Container<number> => {
  // TODO: Container.of(add).ap(a).ap(b)
  return Container.of(0); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 1.2 — умножение двух значений через ap
//
// Напиши функцию multiplyContainers(a, b) — то же самое, но для умножения.
//
// Пример:
//   multiplyContainers(Container.of(3), Container.of(4))  → Container(12)
//   multiplyContainers(Container.of(5), Container.of(0))  → Container(0)
// ---------------------------------------------------------------------------

const multiply = curry((a: number, b: number): number => a * b);

const multiplyContainers = (a: Container<number>, b: Container<number>): Container<number> => {
  // TODO: Container.of(multiply).ap(a).ap(b)
  return Container.of(0); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 1.3 — функция с тремя аргументами через ap
//
// Напиши функцию fullGreeting(greeting, name, punctuation),
// которая принимает три Container со строками и возвращает Container
// с приветственной фразой вида "{greeting}, {name}{punctuation}".
//
// Используй каррированную greet и цепочку .ap().ap().
//
// Пример:
//   fullGreeting(
//     Container.of('Привет'),
//     Container.of('Иван'),
//     Container.of('!')
//   )
//   → Container("Привет, Иван!")
// ---------------------------------------------------------------------------

const greet = curry(
  (greeting: string, name: string, punctuation: string): string =>
    `${greeting}, ${name}${punctuation}`
);

const fullGreeting = (
  greeting: Container<string>,
  name: Container<string>,
  punctuation: Container<string>
): Container<string> => {
  // TODO: Container.of(greet).ap(greeting).ap(name).ap(punctuation)
  return Container.of(''); // TODO-заглушка
};

// ---------------------------------------------------------------------------
// Задание 1.4 — закон тождества (Identity Law)
//
// Один из законов аппликативных функторов гласит:
//   Container.of(id).ap(v) === v
//
// Напиши функцию applyIdentity(container), которая применяет
// Container.of(id) к переданному container через ap и возвращает результат.
//
// Затем мы проверим, что результат эквивалентен исходному container.
//
// Пример:
//   applyIdentity(Container.of(42))     → Container(42)
//   applyIdentity(Container.of('hello')) → Container('hello')
// ---------------------------------------------------------------------------

const id = <A>(x: A): A => x;

const applyIdentity = <A>(container: Container<A>): Container<A> => {
  // TODO: Container.of(id).ap(container)
  return container; // TODO-заглушка
};


export { addContainers, multiplyContainers, fullGreeting, applyIdentity };
