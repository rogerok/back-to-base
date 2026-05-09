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

export const pure1 = <A>(value: A): IO<A> => ({
  tag: "pure",
  value: value,
});

export const readLine1: IO<string> = {
  next: pure1,
  tag: "readLine",
};

export const writeLine1 = (text: string): IO<void> => ({
  next: pure1(undefined),
  tag: "writeLine",
  text,
});

export const bind1 = <A, B>(io: IO<A>, f: (a: A) => IO<B>): IO<B> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);

    case "writeLine":
      return {
        next: bind1(io.next, f),
        tag: "writeLine",
        text: io.text,
      };

    case "readLine":
      return {
        next: {
          tag: "readLine",
        },
        tag: "readLine",
      };
  }
};
