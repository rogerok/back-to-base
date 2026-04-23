import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function";

// Your solution here
interface ValidationError {
  field: string;
  message: string;
}

interface UserInput {
  age: number;
  email: string;
  name: string;
}

const trim = (input: string) => input.trim();

const validateName = (name: string): E.Either<ValidationError, string> => {
  const v = name.trim();

  if (!v) {
    return E.left({ field: "name", message: "Name is required" });
  }

  if (v.length < 2) {
    return E.left({ field: "name", message: "Name must be at least 2 characters" });
  }

  return E.right(v);
};

const validateAge = (age: number): E.Either<ValidationError, number> => {
  if (isNaN(age) || age < 0) {
    return E.left({ field: "age", message: "Age must be a positive number" });
  }

  if (age > 120) {
    return E.left({ field: "age", message: "Age seems invalid" });
  }

  return E.right(age);
};

const validateEmail = (email: string): E.Either<ValidationError, string> => {
  if (!email.includes("@")) {
    return E.left({ field: "email", message: "Invalid email format" });
  }
  return E.right(email);
};

const validateUser = (user: UserInput): UserInput | ValidationError =>
  pipe(
    E.Do,
    E.bind("name", () => validateName(user.name)),
    E.bind("age", () => validateAge(user.age)),
    E.bind("email", () => validateEmail(user.email)),
    E.foldW(
      (e) => e,
      (a) => a,
    ),
  );

console.log(validateUser({ age: 30, email: "alice@example.com", name: "Alice" }));
// { name: 'Alice', age: 30, email: 'alice@example.com' }

console.log(validateUser({ age: 30, email: "alice@example.com", name: "" }));
// { field: 'name', message: 'Name is required' }

console.log(validateUser({ age: -1, email: "bob@example.com", name: "Bob" }));
// { field: 'age', message: 'Age must be a positive number' }
