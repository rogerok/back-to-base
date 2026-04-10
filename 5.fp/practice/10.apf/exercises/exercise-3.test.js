import { describe, expect, it } from 'vitest';

import { Maybe } from './containers.js';
import { safeAdd, safeBetween, safeFormatAddress, safeRange } from './exercise-3.js';

const isNothing = (value) => value instanceof Maybe && value.isNothing;
const valueOf = (value) => (value instanceof Maybe ? value._value : value);

describe('exercise-3.js', () => {
  it('safeAdd', () => {
    expect(valueOf(safeAdd(Maybe.of(2), Maybe.of(3)))).toBe(5);
    expect(valueOf(safeAdd(Maybe.of(100), Maybe.of(-50)))).toBe(50);
    expect(isNothing(safeAdd(Maybe.of(null), Maybe.of(3)))).toBe(true);
    expect(isNothing(safeAdd(Maybe.of(2), Maybe.of(null)))).toBe(true);
  });

  it('safeRange', () => {
    expect(valueOf(safeRange(Maybe.of(1), Maybe.of(4)))).toEqual([1, 2, 3, 4]);
    expect(valueOf(safeRange(Maybe.of(3), Maybe.of(3)))).toEqual([3]);
    expect(valueOf(safeRange(Maybe.of(5), Maybe.of(3)))).toEqual([]);
    expect(isNothing(safeRange(Maybe.of(null), Maybe.of(4)))).toBe(true);
    expect(isNothing(safeRange(Maybe.of(1), Maybe.of(null)))).toBe(true);
  });

  it('safeBetween', () => {
    expect(valueOf(safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(5)))).toBe(true);
    expect(valueOf(safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(15)))).toBe(false);
    expect(valueOf(safeBetween(Maybe.of(5), Maybe.of(5), Maybe.of(5)))).toBe(true);
    expect(isNothing(safeBetween(Maybe.of(1), Maybe.of(10), Maybe.of(null)))).toBe(true);
    expect(isNothing(safeBetween(Maybe.of(null), Maybe.of(10), Maybe.of(5)))).toBe(true);
  });

  it('safeFormatAddress', () => {
    expect(
      valueOf(
        safeFormatAddress(
          Maybe.of('ул. Ленина'),
          Maybe.of('Москва'),
          Maybe.of('Московская обл.'),
          Maybe.of('Россия')
        )
      )
    ).toBe('ул. Ленина, Москва, Московская обл., Россия');
    expect(
      isNothing(
        safeFormatAddress(
          Maybe.of('ул. Ленина'),
          Maybe.of(null),
          Maybe.of('Московская обл.'),
          Maybe.of('Россия')
        )
      )
    ).toBe(true);
    expect(
      isNothing(
        safeFormatAddress(
          Maybe.of('ул. Ленина'),
          Maybe.of('Москва'),
          Maybe.of('Московская обл.'),
          Maybe.of(null)
        )
      )
    ).toBe(true);
  });
});
