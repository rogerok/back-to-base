/**
 * Упражнение 4: Реализуй Maybe с нуля
 * Сложность: сложная
 *
 * Задача:
 *   Реализовать собственный класс MyMaybe, не подглядывая в containers.js.
 *   Это упражнение на понимание: ты должен знать, почему каждый метод
 *   работает именно так, а не иначе.
 *
 * После реализации:
 *   — Твой MyMaybe должен пройти тесты на законы функтора.
 *   — Реализуй бонусный метод chain (flatMap) — он понадобится в следующей главе.
 *
 * Запуск:
 *   node exercise-4.js
 */

// ---------------------------------------------------------------------------
// Реализуй класс MyMaybe
//
// Обязательные методы:
//   static of(value)        — создать экземпляр
//   get isNothing()         — true, если значение null или undefined
//   map(fn)                 — применить fn, если не Nothing; иначе вернуть this
//   getOrElse(defaultValue) — вернуть значение или дефолт
//   filter(predicate)       — вернуть MyMaybe(null), если предикат ложен
//   inspect()               — строковое представление для отладки
//
// Бонусный метод (читай описание ниже перед реализацией):
//   chain(fn)               — "flatMap" для Maybe
//
// Подсказка по chain:
//   map(fn) ожидает, что fn вернёт обычное значение.
//   chain(fn) ожидает, что fn сама вернёт MyMaybe.
//   Если сделать chain через map — получишь MyMaybe внутри MyMaybe.
//   chain должен "разворачивать" вложенность: MyMaybe(MyMaybe(x)) → MyMaybe(x).
//   Реализация проще, чем кажется: не заворачивай результат fn в MyMaybe.of().
// ---------------------------------------------------------------------------

class MyMaybe {
  constructor(value) {
    // TODO
  }

  static of(value) {
    // TODO
  }

  get isNothing() {
    // TODO: возвращает true если _value === null || _value === undefined
  }

  map(fn) {
    // TODO: если isNothing — вернуть this; иначе MyMaybe.of(fn(this._value))
  }

  getOrElse(defaultValue) {
    // TODO
  }

  filter(predicate) {
    // TODO: если isNothing — вернуть this
    //       если predicate(this._value) — вернуть this
    //       иначе — MyMaybe.of(null)
  }

  inspect() {
    // TODO: "MyMaybe(null)" или "MyMaybe(<значение>)"
  }

  // БОНУС: реализуй chain только после того, как все остальные тесты пройдены
  chain(fn) {
    // TODO: если isNothing — вернуть this
    //       иначе — вернуть fn(this._value) напрямую (без обёртки в of!)
  }
}

// ---------------------------------------------------------------------------
// Тесты — не изменяй эту секцию
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

// safeTest перехватывает ошибки при вычислении — чтобы незаполненные
// методы не обрушивали весь запуск, а показывали понятное "ПРОВАЛЕН"
function safeTest(description, getActual, expected) {
  let actual;
  try {
    actual = getActual();
  } catch (e) {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expected)}`);
    console.error(`    Ошибка при вычислении: ${e.message}`);
    failed++;
    return;
  }
  if (actual === expected) {
    console.log(`  ПРОЙДЕН: ${description}`);
    passed++;
  } else {
    console.error(`  ПРОВАЛЕН: ${description}`);
    console.error(`    Ожидалось: ${JSON.stringify(expected)}`);
    console.error(`    Получено:  ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\n--- Упражнение 4: MyMaybe с нуля ---\n');

// Базовое создание и isNothing
console.log('Создание и isNothing:');
safeTest('MyMaybe.of(5) не является Nothing',           () => MyMaybe.of(5).isNothing,         false);
safeTest('MyMaybe.of(null) является Nothing',           () => MyMaybe.of(null).isNothing,      true);
safeTest('MyMaybe.of(undefined) является Nothing',      () => MyMaybe.of(undefined).isNothing, true);
safeTest('MyMaybe.of(0) не является Nothing (falsy!)',  () => MyMaybe.of(0).isNothing,         false);
safeTest('MyMaybe.of("") не является Nothing (falsy!)', () => MyMaybe.of('').isNothing,        false);

// map
console.log('\nmap:');
safeTest('map применяется к значению',
  () => MyMaybe.of(3).map(x => x * 2).getOrElse(null), 6);
safeTest('map на Nothing не вызывает fn',
  () => MyMaybe.of(null).map(x => x * 2).getOrElse(99), 99);
safeTest('map возвращает MyMaybe (проверяем instanceof)',
  () => MyMaybe.of(1).map(x => x + 1) instanceof MyMaybe, true);

// getOrElse
console.log('\ngetOrElse:');
safeTest('getOrElse возвращает значение если оно есть',
  () => MyMaybe.of(42).getOrElse(0), 42);
safeTest('getOrElse возвращает дефолт для Nothing',
  () => MyMaybe.of(null).getOrElse('дефолт'), 'дефолт');
safeTest('getOrElse возвращает 0 если значение 0',
  () => MyMaybe.of(0).getOrElse(99), 0);
safeTest('getOrElse возвращает "" если значение пустая строка',
  () => MyMaybe.of('').getOrElse('нет'), '');

// filter
console.log('\nfilter:');
safeTest('filter пропускает если предикат истинен',
  () => MyMaybe.of(10).filter(x => x > 5).getOrElse(null), 10);
safeTest('filter блокирует если предикат ложен',
  () => MyMaybe.of(3).filter(x => x > 5).getOrElse(null), null);
safeTest('filter на Nothing возвращает Nothing',
  () => MyMaybe.of(null).filter(x => x > 5).getOrElse(99), 99);

// inspect
console.log('\ninspect:');
safeTest('inspect для значения',
  () => MyMaybe.of(7).inspect(), 'MyMaybe(7)');
safeTest('inspect для Nothing',
  () => MyMaybe.of(null).inspect(), 'MyMaybe(null)');

// Законы функтора
console.log('\nЗаконы функтора:');
const id  = (x) => x;
const add = (x) => x + 5;
const mul = (x) => x * 3;
const val = 10;

safeTest(
  'Закон идентичности: map(id) не меняет значение',
  () => MyMaybe.of(val).map(id).getOrElse(null) === MyMaybe.of(val).getOrElse(null),
  true
);
safeTest(
  'Закон композиции: map(f).map(g) === map(x => g(f(x)))',
  () => MyMaybe.of(val).map(add).map(mul).getOrElse(null) ===
        MyMaybe.of(val).map(x => mul(add(x))).getOrElse(null),
  true
);
safeTest(
  'Закон идентичности для Nothing',
  () => MyMaybe.of(null).map(id).isNothing,
  true
);

// Бонус: chain
console.log('\nБОНУС chain:');
// chain отличается от map тем, что fn сама возвращает MyMaybe
const safeDivide = (n) => (divisor) =>
  divisor === 0 ? MyMaybe.of(null) : MyMaybe.of(n / divisor);

safeTest(
  'chain: деление на ненулевой делитель',
  () => MyMaybe.of(10).chain(safeDivide(10)).getOrElse('деление на ноль'),
  1
);
safeTest(
  'chain: деление на ноль → Nothing',
  () => MyMaybe.of(0).chain(safeDivide(10)).getOrElse('деление на ноль'),
  'деление на ноль'
);
safeTest(
  'chain на Nothing не вызывает fn',
  () => MyMaybe.of(null).chain(safeDivide(10)).getOrElse('Nothing'),
  'Nothing'
);
safeTest(
  'chain не создаёт двойную вложенность MyMaybe(MyMaybe(...))',
  () => MyMaybe.of(5).chain(x => MyMaybe.of(x * 2)) instanceof MyMaybe,
  true
);
safeTest(
  'chain: значение внутри не завёрнуто лишний раз',
  () => MyMaybe.of(5).chain(x => MyMaybe.of(x * 2)).getOrElse(null),
  10
);

// Итог
console.log(`\nРезультат: ${passed} пройдено, ${failed} провалено`);
if (failed === 0) {
  console.log('Все тесты пройдены!');
} else {
  console.log('Есть ошибки — исправь TODO и запусти снова.');
  process.exit(1);
}
