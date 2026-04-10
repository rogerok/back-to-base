import { describe, expect, it } from 'vitest';

import { Maybe } from './containers.js';
import { safeAdd, safeCreateDate, safeFullName, safeMultiply3 } from './exercise-2.js';

const isNothing = (value) => value instanceof Maybe && value.isNothing;
const valueOf = (value) => (value instanceof Maybe ? value._value : value);

describe('exercise-2.js', () => {
  it('safeAdd', () => {
    expect(valueOf(safeAdd(Maybe.of(2), Maybe.of(3)))).toBe(5);
    expect(valueOf(safeAdd(Maybe.of(10), Maybe.of(-4)))).toBe(6);
    expect(isNothing(safeAdd(Maybe.of(null), Maybe.of(3)))).toBe(true);
    expect(isNothing(safeAdd(Maybe.of(2), Maybe.of(null)))).toBe(true);
    expect(isNothing(safeAdd(Maybe.of(null), Maybe.of(null)))).toBe(true);
  });

  it('safeFullName', () => {
    expect(valueOf(safeFullName({ firstName: 'Иван', lastName: 'Петров' }))).toBe('Иван Петров');
    expect(isNothing(safeFullName({ firstName: null, lastName: 'Петров' }))).toBe(true);
    expect(isNothing(safeFullName({ firstName: 'Иван', lastName: null }))).toBe(true);
    expect(isNothing(safeFullName({ firstName: null, lastName: null }))).toBe(true);
  });

  it('safeCreateDate', () => {
    expect(valueOf(safeCreateDate(Maybe.of(2024), Maybe.of(3), Maybe.of(5)))).toBe('2024-03-05');
    expect(valueOf(safeCreateDate(Maybe.of(2000), Maybe.of(12), Maybe.of(31)))).toBe('2000-12-31');
    expect(isNothing(safeCreateDate(Maybe.of(2024), Maybe.of(null), Maybe.of(5)))).toBe(true);
    expect(isNothing(safeCreateDate(Maybe.of(null), Maybe.of(3), Maybe.of(5)))).toBe(true);
  });

  it('safeMultiply3', () => {
    expect(valueOf(safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(4)))).toBe(24);
    expect(isNothing(safeMultiply3(Maybe.of(null), Maybe.of(3), Maybe.of(4)))).toBe(true);
    expect(isNothing(safeMultiply3(Maybe.of(2), Maybe.of(null), Maybe.of(4)))).toBe(true);
    expect(isNothing(safeMultiply3(Maybe.of(2), Maybe.of(3), Maybe.of(null)))).toBe(true);
  });
});
