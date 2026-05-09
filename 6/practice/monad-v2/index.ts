import { IO } from "./type.ts";

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

export const pure = <A>(value: A): IO<A> => ({
  tag: "pure",
  value: value,
});

export const readLine: IO<string> = {
  next: pure,
  tag: "readLine",
};

export const writeLine = (text: string): IO<void> => ({
  next: pure(undefined),
  tag: "writeLine",
  text,
});

export const bind = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);

    case "writeLine":
      return {
        next: bind(io.next, f),
        tag: "writeLine",
        text: io.text,
      };

    case "readLine":
      return {
        next: (a) => bind(io.next(a), f),
        tag: "readLine",
      };
  }
};

export const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> => bind(io, (a) => pure(f(a)));
export const addThen = <A, B>(first: IO<A>, second: IO<B>): IO<B> => bind(first, () => second);

export const sequence = <A>(arr: IO<A>[]): IO<Array<A>> =>
  arr.reduce<IO<Array<A>>>(
    (acc, item) => bind(acc, (pureArr) => bind(item, (pureItem) => pure([...pureArr, pureItem]))),
    pure([]),
  );

export const myProgram: IO<void> = bind(writeLine("What is your name?"), () =>
  bind(readLine, (name) =>
    bind(writeLine("Hello, " + name + "! How old are you?"), () =>
      bind(readLine, (age) => writeLine("Wow, " + name + ", " + age + " is a great age!")),
    ),
  ),
);
