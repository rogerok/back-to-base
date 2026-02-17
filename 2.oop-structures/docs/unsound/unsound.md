# TypeScript: unsound behavior

[Оригинал статьи](https://habr.com/ru/articles/492106/)

**Soundness** - возможность анализатора доказать отсутствие ошибок во время работы программы.
Если программа принята анализатором, то она гарантировано safe.

**Safe program** - программа, которая может работать без ошибок вечно.

**Correct program** — программа, которая делает то, что должна и не делает того, что не должна.

## Структурная типизация

### Проблема № 1

Мы хотим отправить письмо `sendEmail` по корректному адресу `ValidatedEmail`, есть функция проверки адреса `validateEmail` которая возвращает корректный адрес `ValidatedEmail`. К сожалению TS позволяет передать любую строку в `sendEmail`, т.к. `ValidatedEmail` для TS не отличается от `string`

```ts
type ValidatedEmail = string;

declare function validateEmail(email: string): ValidatedEmail;

declare function sendEmail(email: ValidatedEmail): void;

sendEmail(validateEmail("asdf@gmail.com"));

// Should be error!
sendEmail("asdf@gmail.com");
```

Совет

Мы можем создать `Opaque` тип, который будет принимать некий `T` и придавать ему уникальности объединяя с типом, созданным из переданного `K`. `K` может быть как уникальным символом (`unique symbol`), так и строкой (тогда нужно будет следить, чтобы эти строки были уникальны).

```ts
type Opaque<K extends symbol | string, T> = T & { [X in K]: never };

declare const validatedEmailK: unique symbol;
type ValidatedEmail = Opaque<typeof validatedEmailK, string>;
// type ValidatedEmail = Opaque<'ValidatedEmail', string>;

declare function validateEmail(email: string): ValidatedEmail;

declare function sendEmail(mail: ValidatedEmail): void;
sendEmail(validateEmail("asdf@gmail.com"));

// Argument of type '"asdf@gmail.com"' is not assignable
//  to parameter of type 'Opaque<unique symbol, string>'.
sendEmail("asdf@gmail.com");
```

### Проблема № 2

У нас есть класс Доллара и Евро, у каждого из классов есть метод `add` для сложения доллара с долларом, а евро с евро.
Для TS структурно эти классы равны и мы можем сложить доллар с евро.

```ts
export class Dollar {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  add(dollar: Dollar): Dollar {
    return new Dollar(dollar.value + this.value);
  }
}

class Euro {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  add(euro: Euro): Euro {
    return new Euro(euro.value + this.value);
  }
}

const dollars100 = new Dollar(100);
const euro100 = new Euro(100);

// Correct
dollars100.add(dollars100);
euro100.add(euro100);

// Should be error!
dollars100.add(euro100);
```

Совет

Если у класса есть приватное поле (нативное с `#` или от TS c `private`), то класс магически становится Номинальным, имя и значение может быть любым. Используется `!` (definite assignment assertion) чтобы TS не ругался на не проинициализированное поле (strictNullChecks, strictPropertyInitialization флаги включены).

```ts
class Dollar {
  // #desc!: never;
  private desc!: never;
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  add(dollar: Dollar) {
    return new Dollar(dollar.value + this.value);
  }
}

class Euro {
  // #desc!: never;
  private desc!: never;
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  add(euro: Euro) {
    return new Euro(euro.value + this.value);
  }
}

const dollars100 = new Dollar(100);
const euro100 = new Euro(100);

// Correct
dollars100.add(dollars100);
euro100.add(euro100);

// Error: Argument of type 'Euro' is not assignable to parameter of type 'Dollar
dollars100.add(euro100);
```

## Type variance

### Type variance 1. Проблема

Вариантность в программировании -
это возможность передавать Supertype/Subtype туда, гда Type ожидается. Например, есть иерархия Shape -> Circle -> Rectangle то можно ли передать или вернуть Shape/Rectangle, если ожидается Circle?

Мы можем передать тип с полем в котором лежит число, в функцию, которая ожидает поле как строку или число, а в теле мутирует переданный объект, изменяя поле на строку.

`{ status: number } as { status: number | string } as { status: string }`

```ts
function changeStatus(arg: { status: number | string }) {
  arg.status = "NotFound";
}

const error: { status: number } = { status: 404 };
changeStatus(error);

// Error: toFixed is not a function
console.log(error.status.toFixed());
```

#### Совет

Если мы работаем с иммутабельными структурами, то подобной ошибки не будет (strictFunctionTypes флаг мы уже включили).

```ts
function changeStatus(arg: Readonly<{ status: number | string }>) {
  // Error: Cannot assign, status is not writable
  arg.status = "NotFound";
}

const error: Readonly<{ status: number }> = { status: 404 };
changeStatus(error);

console.log(error.status.toFixed());
```

Но, даже, если мы создали Readonly тип, то TS не запретит передать в функцию, где ожидается не Readonly `Readonly<{ readonly status: number }> as { status: number | string } as { status: string }`

```ts
function changeStatus(arg: { status: number | string }) {
  arg.status = "NotFound";
}

const error: Readonly<{ readonly status: number }> = { status: 404 };
changeStatus(error);

// Error: toFixed is not a function
console.log(error.status.toFixed());
```

### Type variance 2. Проблема

Объекты могут содержать дополнительные поля, которых нету у соответствующих им типах.

```ts
{message: string; status: string} as {message:string}
```

из-за чего некоторые операции могут быть небезопасны

```ts
const error: { message: string; status: string } = {
  message: "No data",
  status: "NotFound",
};

function updateError(arg: { message: string }) {
  const defaultError = { message: "Not found", status: 404 };
  const newError: { message: string; status: number } = { ...defaultError, ...arg };

  // Error: toFixed is not a function
  console.log(newError.status.toFixed());
}

updateError(error);
```

#### Type variance 2. Совет

Мержить объекты, явно перечисляя поля или отфильтровывать не известные поля.

```ts
const error: { message: string; status: string } = {
  message: "No data",
  status: "NotFound",
};

function updateError(arg: { message: string }) {
  const defaultError = { message: "Not found", status: 404 };
  // Merge explicitly or filter unknown fields
  const newError = { ...defaultError, message: arg.message };
  console.log(newError.status.toFixed());
}

updateError(error);
```

## Refinement invalidation. Проблема

После того, как мы доказали что-то про внешнее состояние — вызывать функции не безопасно, т.к. нет гарантий, что функции не меняют это внешнее состояние:

```ts
export function logAge(name: string, age: number) {
  console.log(`${name} will lose ${age.toFixed()}`);

  person.age = "PLACEHOLDER";
}

const person: { name: string; age: number | string } = {
  name: "Person",
  age: 42,
};

if (typeof person.age === "number") {
  logAge(person.name, person.age);
  // refinement should be invalidated
  logAge(person.name, person.age);
}
```

### Refinement invalidation. Совет

Используйте иммутабельные структуры данных, тогда вызов функций будет априори безопасен для сделанных ранее проверок.

## Exceptions. Проблема

TS никак не помогает работать с Exceptions, по сигнатуре функции ничего не ясно.

```ts
function getJoke(isFunny: boolean): string {
  if (isFunny) {
    throw new JokeError("No funny joke");
  }

  return "Duh";
}

const joke: string = getJoke(true);

console.log(joke);
```

Почему-то в TS определение типа для Promise игнорирует тип ошибки

```ts
const promise1: Promise<number> = Promise.resolve(42);

const promise: Promise<never> = Promise.reject(new TypeError());

// typescript/lib
interface PromiseConstructor {
  new <T>(
    executor: (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
    ) => void,
  ): Promise<T>;
}
```

### Exceptions. Совет

```ts
import { Either, exhaustiveCheck, JokeError } from "../helpers";

function getJoke(isFunny: boolean): Either<JokeError, string> {
  if (isFunny) {
    return Either.left(new JokeError("No funny joke"));
  }
  return Either.right("Duh");
}

getJoke(true)
  // (parameter) error: JokeError
  .mapLeft((error) => {
    if (error instanceof JokeError) {
      console.log("JokeError");
    } else {
      exhaustiveCheck(error);
    }
  })
  // (parameter) joke: string
  .mapRight((joke) => console.log(joke));
```

## Unsafe operations. Проблема

Если у нас есть кортеж фиксированного размера, то TS может гарантировать, что по запрошенному индексу что-то есть.
Для массива подобное работать не будет и TS будет нам доверять

```ts
// interface Array<T> {
//   [n: number]: T | undefined;
// }

const dynamicNumbers: number[] = [1, 2, 3];
// Error: Object is possibly 'undefined'.
console.log(dynamicNumbers[100].toFixed());

// Optional chaining `?`
console.log(dynamicNumbers[100]?.toFixed());

// type refinement
if (typeof dynamicNumbers[100] === "number") {
  console.log(dynamicNumbers[100].toFixed());
}
```

### Unsafe operations. Совет

Чтобы не плодить сущностей сверх надобности возьмем известный ранее контейнер `Either` и напишем безопасную функцию по работе с индексом, которая будет возвращать `Either<null, T>`.

```ts
import { Either } from "../helpers";

function safeIndex<T>(array: T[], index: number): Either<null, T> {
  if (index in array) {
    return Either.right(array[index]);
  }
  return Either.left(null);
}

const dynamicNumbers: number[] = [1, 2, 3];

safeIndex(dynamicNumbers, 100)
  .mapLeft(() => console.log("Nothing"))
  .mapRight((el) => el + 2)
  .mapRight((el) => console.log(el.toFixed()));
```

## Type guard

TS доверяет программисту, что `isSuperUser` правильно определяет кто `SuperUser` и если будет добавлен `Vasya`, никаких подсказок не будет.

```ts
type SimpleUser = { name: string };
type SuperUser = {
  name: string;
  isAdmin: true;
  permissions: string[];
};
type Vasya = { name: string; isAdmin: true; isGod: true };
type User = SimpleUser | SuperUser | Vasya;

function isSuperUser(user: User): user is SuperUser {
  return "isAdmin" in user && user.isAdmin;
}

function doSomethings(user: User) {
  // Error: Cannot read property 'join' of undefined
  if (isSuperUser(user)) {
    console.log(user.permissions.join(","));
  }
}
```
