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

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test<A>(description: string, actual: Container<A> | A, expected: Container<A> | A): void {
  const actualVal = actual instanceof Container ? actual.value : actual;
  const expectedVal = expected instanceof Container ? expected.value : expected;

  if (actualVal === expectedVal) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expectedVal)}`);
    console.error(`    Получено:  ${JSON.stringify(actualVal)}`);
    failed++;
  }
}

function testInstance<A>(
  description: string,
  actual: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedClass: new (...args: any[]) => A
): void {
  if (actual instanceof expectedClass) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидался экземпляр ${expectedClass.name}`);
    console.error(`    Получено: ${actual}`);
    failed++;
  }
}

console.log('\n--- Упражнение 1: ap с Container ---\n');

// 1.1 addContainers
console.log('1.1 addContainers:');
test(
  'addContainers(Container(2), Container(3)) → Container(5)',
  addContainers(Container.of(2), Container.of(3)),
  Container.of(5)
);
test(
  'addContainers(Container(10), Container(-4)) → Container(6)',
  addContainers(Container.of(10), Container.of(-4)),
  Container.of(6)
);
test(
  'addContainers(Container(0), Container(0)) → Container(0)',
  addContainers(Container.of(0), Container.of(0)),
  Container.of(0)
);

// 1.2 multiplyContainers
console.log('\n1.2 multiplyContainers:');
test(
  'multiplyContainers(Container(3), Container(4)) → Container(12)',
  multiplyContainers(Container.of(3), Container.of(4)),
  Container.of(12)
);
test(
  'multiplyContainers(Container(5), Container(0)) → Container(0)',
  multiplyContainers(Container.of(5), Container.of(0)),
  Container.of(0)
);
test(
  'multiplyContainers(Container(-2), Container(6)) → Container(-12)',
  multiplyContainers(Container.of(-2), Container.of(6)),
  Container.of(-12)
);

// 1.3 fullGreeting
console.log('\n1.3 fullGreeting:');
test(
  'fullGreeting(Container("Привет"), Container("Иван"), Container("!")) → Container("Привет, Иван!")',
  fullGreeting(Container.of('Привет'), Container.of('Иван'), Container.of('!')),
  Container.of('Привет, Иван!')
);
test(
  'fullGreeting(Container("Здравствуй"), Container("Мир"), Container(".")) → Container("Здравствуй, Мир.")',
  fullGreeting(Container.of('Здравствуй'), Container.of('Мир'), Container.of('.')),
  Container.of('Здравствуй, Мир.')
);

// 1.4 Identity Law
console.log('\n1.4 Закон тождества — Container.of(id).ap(v) эквивалентен v:');
test(
  'applyIdentity(Container(42)) → Container(42)',
  applyIdentity(Container.of(42)),
  Container.of(42)
);
test(
  "applyIdentity(Container('hello')) → Container('hello')",
  applyIdentity(Container.of('hello')),
  Container.of('hello')
);
testInstance(
  'результат applyIdentity является экземпляром Container',
  applyIdentity(Container.of(99)),
  Container
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
