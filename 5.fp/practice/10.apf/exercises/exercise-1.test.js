import { describe, expect, it } from 'vitest';

import { Container } from './containers.js';
import {
  addContainers,
  applyIdentity,
  fullGreeting,
  multiplyContainers,
} from './exercise-1.js';

const valueOf = (value) => (value instanceof Container ? value._value : value);

describe('exercise-1.js', () => {
  it('addContainers', () => {
    expect(valueOf(addContainers(Container.of(2), Container.of(3)))).toBe(5);
    expect(valueOf(addContainers(Container.of(10), Container.of(-4)))).toBe(6);
    expect(valueOf(addContainers(Container.of(0), Container.of(0)))).toBe(0);
  });

  it('multiplyContainers', () => {
    expect(valueOf(multiplyContainers(Container.of(3), Container.of(4)))).toBe(12);
    expect(valueOf(multiplyContainers(Container.of(5), Container.of(0)))).toBe(0);
    expect(valueOf(multiplyContainers(Container.of(-2), Container.of(6)))).toBe(-12);
  });

  it('fullGreeting', () => {
    expect(valueOf(fullGreeting(Container.of('Привет'), Container.of('Иван'), Container.of('!')))).toBe(
      'Привет, Иван!'
    );
    expect(
      valueOf(fullGreeting(Container.of('Здравствуй'), Container.of('Мир'), Container.of('.')))
    ).toBe('Здравствуй, Мир.');
  });

  it('applyIdentity', () => {
    expect(valueOf(applyIdentity(Container.of(42)))).toBe(42);
    expect(valueOf(applyIdentity(Container.of('hello')))).toBe('hello');
    expect(applyIdentity(Container.of(99))).toBeInstanceOf(Container);
  });
});
