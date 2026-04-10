import { describe, expect, it } from 'vitest';

import { Left, Right, type Either } from './containers.ts';
import {
  parseAndAdd,
  validateAndCreateUser,
  validateForm,
  validateFormSequential,
} from './exercise-4.ts';

const rightValue = <A>(value: Either<string, A>): A | undefined =>
  value instanceof Right ? value.value : undefined;
const leftValue = <A>(value: Either<string, A>): string | undefined =>
  value instanceof Left ? value.value : undefined;

describe('exercise-4.ts', () => {
  it('validateAndCreateUser', () => {
    expect(rightValue(validateAndCreateUser('Иван', 'ivan@example.com', 25))).toEqual({
      name: 'Иван',
      email: 'ivan@example.com',
      age: 25,
    });
    expect(rightValue(validateAndCreateUser('Анна', 'ANNA@TEST.COM', 30))).toEqual({
      name: 'Анна',
      email: 'anna@test.com',
      age: 30,
    });
    expect(leftValue(validateAndCreateUser('', 'ivan@example.com', 25))).toBe(
      'Имя не может быть пустым'
    );
    expect(leftValue(validateAndCreateUser('Иван', 'не-email', 25))).toBe(
      'Некорректный email: отсутствует @'
    );
    expect(leftValue(validateAndCreateUser('Иван', 'ivan@example.com', 200))).toBe(
      'Возраст должен быть числом от 0 до 150'
    );
    expect(validateAndCreateUser('', 'не-email', 25)).toBeInstanceOf(Left);
  });

  it('parseAndAdd', () => {
    expect(rightValue(parseAndAdd('3.5', '1.5'))).toBe(5);
    expect(rightValue(parseAndAdd('10', '-4'))).toBe(6);
    expect(rightValue(parseAndAdd('0', '0'))).toBe(0);
    expect(leftValue(parseAndAdd('abc', '5'))).toBe('Не число: "abc"');
    expect(leftValue(parseAndAdd('3', 'xyz'))).toBe('Не число: "xyz"');
  });

  it('validateForm and validateFormSequential', () => {
    const validForm = { name: 'Мария', email: 'maria@test.com', age: 28 };
    const nameErrorForm = { name: '', email: 'maria@test.com', age: 28 };
    const emailErrorForm = { name: 'Мария', email: 'не-email', age: 28 };

    expect(rightValue(validateForm(validForm))).toEqual(validForm);
    expect(rightValue(validateFormSequential(validForm))).toEqual(validForm);
    expect(leftValue(validateForm(nameErrorForm))).toBe('Имя не может быть пустым');
    expect(leftValue(validateFormSequential(nameErrorForm))).toBe('Имя не может быть пустым');
    expect(leftValue(validateForm(emailErrorForm))).toBe('Некорректный email: отсутствует @');
    expect(leftValue(validateFormSequential(emailErrorForm))).toBe(
      'Некорректный email: отсутствует @'
    );
  });
});
