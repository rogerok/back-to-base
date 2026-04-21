// Task 3: Either
// Rewrite using Either from fp-ts/Either
// Replace try/catch and error returns with Either

interface ValidationError {
  field: string;
  message: string;
}

interface UserInput {
  name: string;
  age: number;
  email: string;
}

function validateName(name: string): string | ValidationError {
  if (!name || name.trim().length === 0) {
    return { field: 'name', message: 'Name is required' };
  }
  if (name.length < 2) {
    return { field: 'name', message: 'Name must be at least 2 characters' };
  }
  return name.trim();
}

function validateAge(age: number): number | ValidationError {
  if (isNaN(age) || age < 0) {
    return { field: 'age', message: 'Age must be a positive number' };
  }
  if (age > 120) {
    return { field: 'age', message: 'Age seems invalid' };
  }
  return age;
}

function validateEmail(email: string): string | ValidationError {
  if (!email.includes('@')) {
    return { field: 'email', message: 'Invalid email format' };
  }
  return email;
}

function validateUser(input: UserInput): UserInput | ValidationError {
  const name = validateName(input.name);
  if (typeof name === 'object') return name;

  const age = validateAge(input.age);
  if (typeof age === 'object') return age;

  const email = validateEmail(input.email);
  if (typeof email === 'object') return email;

  return { name, age, email };
}

console.log(validateUser({ name: 'Alice', age: 30, email: 'alice@example.com' }));
// { name: 'Alice', age: 30, email: 'alice@example.com' }

console.log(validateUser({ name: '', age: 30, email: 'alice@example.com' }));
// { field: 'name', message: 'Name is required' }

console.log(validateUser({ name: 'Bob', age: -1, email: 'bob@example.com' }));
// { field: 'age', message: 'Age must be a positive number' }
