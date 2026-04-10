import { describe, expect, it } from 'vitest';

import { Container } from './containers.ts';
import {
  addContainers,
  applyIdentity,
  fullGreeting,
  multiplyContainers,
} from './exercise-1.ts';

describe('exercise-1.ts', () => {
  it('addContainers', () => {
    expect(addContainers(Container.of(2), Container.of(3)).value).toBe(5);
    expect(addContainers(Container.of(10), Container.of(-4)).value).toBe(6);
    expect(addContainers(Container.of(0), Container.of(0)).value).toBe(0);
  });

  it('multiplyContainers', () => {
    expect(multiplyContainers(Container.of(3), Container.of(4)).value).toBe(12);
    expect(multiplyContainers(Container.of(5), Container.of(0)).value).toBe(0);
    expect(multiplyContainers(Container.of(-2), Container.of(6)).value).toBe(-12);
  });

  it('fullGreeting', () => {
    expect(fullGreeting(Container.of('Привет'), Container.of('Иван'), Container.of('!')).value).toBe(
      'Привет, Иван!'
    );
    expect(
      fullGreeting(Container.of('Здравствуй'), Container.of('Мир'), Container.of('.')).value
    ).toBe('Здравствуй, Мир.');
  });

  it('applyIdentity', () => {
    expect(applyIdentity(Container.of(42)).value).toBe(42);
    expect(applyIdentity(Container.of('hello')).value).toBe('hello');
    expect(applyIdentity(Container.of(99))).toBeInstanceOf(Container);
  });
});
