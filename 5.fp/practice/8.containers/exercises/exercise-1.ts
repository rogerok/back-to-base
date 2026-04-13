/**
 * Упражнение 1: Разминка с Container
 * Сложность: начинающий
 *
 * Задача:
 *   Освоить базовые операции с Container — создание через of и трансформацию
 *   через map. Проверить, что Container соблюдает два закона функтора.
 *
 * Запуск:
 *   npx tsx exercise-1.ts
 */

import { Container } from "./containers.ts";

// ---------------------------------------------------------------------------
// Задание 1.1
// Напиши функцию doubleInContainer, которая принимает число,
// оборачивает его в Container и возвращает Container с удвоенным значением.
//
// Пример:
//   doubleInContainer(5)  → Container(10)
//   doubleInContainer(0)  → Container(0)
//   doubleInContainer(-3) → Container(-6)
// ---------------------------------------------------------------------------

const doubleInContainer = (n: number): Container<number> => {
  return Container.of(n * 2);
};

// ---------------------------------------------------------------------------
// Задание 1.2
// Напиши функцию addExclamation, которая принимает строку,
// оборачивает в Container и добавляет "!" в конец.
//
// Пример:
//   addExclamation('Привет')  → Container(Привет!)
//   addExclamation('')        → Container(!)
// ---------------------------------------------------------------------------

const addExclamation = (str: string): Container<string> => {
  // TODO
  return Container.of(str + "!");
};

// ---------------------------------------------------------------------------
// Задание 1.3
// Напиши функцию containerChain, которая принимает число и выполняет
// последовательно три трансформации через map:
//   1) прибавляет 1
//   2) умножает на 3
//   3) вычитает 2
//
// Пример:
//   containerChain(4)  → Container(13)  // ((4+1)*3)-2 = 13
//   containerChain(0)  → Container(1)   // ((0+1)*3)-2 = 1
// ---------------------------------------------------------------------------

const containerChain = (n: number): Container<number> => {
  // TODO: три вызова .map() подряд
  return Container.of(n)
    .map((v) => v + 1)
    .map((v) => v * 3)
    .map((v) => v - 2);
};

// ---------------------------------------------------------------------------
// Задание 1.4 — Законы функтора
// Проверь вручную, что Container соблюдает оба закона.
// Заполни пустые места (???) правильными вызовами.
//
// Закон идентичности: container.map(x => x) ведёт себя как сам контейнер.
// Закон композиции:   container.map(f).map(g) === container.map(x => g(f(x))).
// ---------------------------------------------------------------------------

const checkFunctorLaws = (value: number): { compositionHolds: boolean; identityHolds: boolean } => {
  const id = (x: number): number => x;
  const f = (x: number): number => x + 10;
  const g = (x: number): number => x * 2;

  // Закон идентичности
  const original = Container.of(value);
  const afterId = Container.of(value).map(id);
  // Значения должны совпасть:
  const identityHolds = original.value === afterId.value;

  // Закон композиции
  const twoMaps = Container.of(value).map(f).map(g);
  const oneMap = Container.of(value).map((x) => g(f(x)));
  // TODO: сравни twoMaps.value и oneMap.value
  const compositionHolds: boolean = twoMaps.value === oneMap.value;

  return { compositionHolds, identityHolds };
};

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

function test(description: string, actual: unknown, expected: unknown): void {
  it(description, () => {
    expect(actual).toEqual(expected);
  });
}

console.log("\n--- Упражнение 1: Container ---\n");

// 1.1 doubleInContainer
console.log("1.1 doubleInContainer:");
test("doubleInContainer(5) возвращает Container с 10", doubleInContainer(5)?.value, 10);
test("doubleInContainer(0) возвращает Container с 0", doubleInContainer(0)?.value, 0);
test("doubleInContainer(-3) возвращает Container с -6", doubleInContainer(-3)?.value, -6);

// 1.2 addExclamation
console.log("\n1.2 addExclamation:");
test(
  'addExclamation("Привет") возвращает Container с "Привет!"',
  addExclamation("Привет")?.value,
  "Привет!",
);
test('addExclamation("") возвращает Container с "!"', addExclamation("")?.value, "!");

// 1.3 containerChain
console.log("\n1.3 containerChain:");
test("containerChain(4) = Container(13)", containerChain(4)?.value, 13);
test("containerChain(0) = Container(1)", containerChain(0)?.value, 1);
test("containerChain(9) = Container(28)", containerChain(9)?.value, 28);

// 1.4 Законы функтора
console.log("\n1.4 Законы функтора:");
const laws5 = checkFunctorLaws(5);
const laws100 = checkFunctorLaws(100);
test("Закон идентичности выполняется для 5", laws5.identityHolds, true);
test("Закон идентичности выполняется для 100", laws100.identityHolds, true);
test("Закон композиции выполняется для 5", laws5.compositionHolds, true);
test("Закон композиции выполняется для 100", laws100.compositionHolds, true);
