import { describe, expect, it } from 'vitest';

import { Left, Right, IO, Maybe, type Either } from './containers.ts';
import {
  buildProfileApplicative,
  buildProfileSequential,
  fetchUserOrders,
  processForm,
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
} from './exercise-5.ts';

const rightValue = <A>(value: Either<string, A>): A | undefined =>
  value instanceof Right ? value.value : undefined;
const leftValue = <A>(value: Either<string, A>): string | undefined =>
  value instanceof Left ? value.value : undefined;
const maybeValue = <A>(value: Maybe<A>): A | null | undefined => value.value;

describe('exercise-5.ts', () => {
  it('buildProfile', () => {
    expect(buildProfileApplicative(1)).toBeInstanceOf(IO);
    expect(buildProfileApplicative(1).unsafePerformIO()).toEqual({
      name: 'Алиса',
      avatarUrl: 'https://cdn.example.com/alice.jpg',
      posts: 42,
      followers: 1000,
    });
    expect(buildProfileApplicative(2).unsafePerformIO()).toEqual({
      name: 'Борис',
      avatarUrl: 'https://cdn.example.com/boris.jpg',
      posts: 7,
      followers: 150,
    });
    expect(buildProfileApplicative(999).unsafePerformIO()).toBeNull();

    expect(buildProfileSequential(1).unsafePerformIO()).toEqual({
      name: 'Алиса',
      avatarUrl: 'https://cdn.example.com/alice.jpg',
      posts: 42,
      followers: 1000,
    });
  });

  it('fetchUserOrders', () => {
    expect(fetchUserOrders(1).unsafePerformIO()).toEqual([
      { id: 'ord_1', amount: 500 },
      { id: 'ord_2', amount: 1200 },
    ]);
    expect(fetchUserOrders(2).unsafePerformIO()).toEqual([{ id: 'ord_3', amount: 300 }]);
    expect(fetchUserOrders(999).unsafePerformIO()).toBeNull();
  });

  it('processForm', () => {
    expect(
      rightValue(
        processForm({
          name: 'Мария',
          email: 'maria@test.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        })
      )
    ).toEqual({ name: 'Мария', email: 'maria@test.com', password: 'supersecret' });
    expect(
      leftValue(
        processForm({
          name: '',
          email: 'maria@test.com',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        })
      )
    ).toBe('Имя не может быть пустым');
    expect(
      leftValue(
        processForm({
          name: 'Мария',
          email: 'не-email',
          password: 'supersecret',
          confirmPassword: 'supersecret',
        })
      )
    ).toBe('Некорректный email');
    expect(
      leftValue(
        processForm({
          name: 'Мария',
          email: 'maria@test.com',
          password: 'short',
          confirmPassword: 'short',
        })
      )
    ).toBe('Пароль должен содержать минимум 8 символов');
    expect(
      leftValue(
        processForm({
          name: 'Мария',
          email: 'maria@test.com',
          password: 'supersecret',
          confirmPassword: 'different',
        })
      )
    ).toBe('Пароли не совпадают');
  });

  it('scenario quiz', () => {
    expect(maybeValue(scenarioA(Maybe.of(3), Maybe.of(4)))).toBe(12);
    expect(scenarioA(Maybe.of(null), Maybe.of(4)).isNothing).toBe(true);

    const arr = [10, 20, 30, 40, 50];
    expect(maybeValue(scenarioB(arr, Maybe.of(2)))).toBe(30);
    expect(maybeValue(scenarioB(arr, Maybe.of(0)))).toBe(10);
    expect(scenarioB(arr, Maybe.of(null)).isNothing).toBe(true);

    expect(maybeValue(scenarioC(Maybe.of(1), Maybe.of(2), Maybe.of(3)))).toBe(6);
    expect(scenarioC(Maybe.of(null), Maybe.of(2), Maybe.of(3)).isNothing).toBe(true);

    expect(maybeValue(scenarioD(Maybe.of(9)))).toBe(3);
    expect(maybeValue(scenarioD(Maybe.of(4)))).toBe(2);
    expect(scenarioD(Maybe.of(-1)).isNothing).toBe(true);
    expect(scenarioD(Maybe.of(0)).isNothing).toBe(true);
    expect(scenarioD(Maybe.of(null)).isNothing).toBe(true);
  });
});
