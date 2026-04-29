// === 1 Task DSL ===

export type IO<A> = IOPure<A> | IOReadLine<A> | IOWriteLine<A>;

export type IOPure<A> = {
  tag: "pure";
  value: A;
};

export type IOReadLine<A> = {
  tag: "readLine";
  next: (s: string) => IO<A>;
};

export type IOWriteLine<A> = {
  next: IO<A>;
  tag: "writeLine";
  text: string;
};

export const greeting: IO<void> = {
  next: {
    next: (name) => ({
      next: { tag: "pure", value: undefined },
      tag: "writeLine",
      text: `Hello, ${name}!`,
    }),
    tag: "readLine",
  },
  tag: "writeLine",
  text: "What is your name?",
};

// === 2 Task constructors ===

export const pure = <A>(value: A): IO<A> => ({ tag: "pure", value: value });

export const readLine: IO<string> = {
  next: pure<string>,
  tag: "readLine",
};

export const writeLine = (text: string): IO<void> => ({
  next: pure(undefined),
  tag: "writeLine",
  text,
});

// === 3 Task bind ====

export const bind = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);

    case "readLine":
      return { ...readLine, next: (x) => bind(io.next(x), f) };

    case "writeLine":
      return { next: bind(io.next, f), tag: "writeLine", text: io.text };
  }
};

export const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> => bind(io, (x) => pure(f(x)));

export const andThen = <A, B>(first: IO<A>, second: IO<B>): IO<B> => bind(first, () => second);

const askName = andThen(writeLine("What is your name?"), readLine);
const writeName = (name: string) => writeLine(`Hello, ${name}! How old are you?`);
const writeAge = (name: string, age: string) => writeLine(`Wow, ${name}, ${age} is a great age!`);

export const myProgram = bind(askName, (name) =>
  bind(andThen(writeName(name), readLine), (age) => writeAge(name, age)),
);
