type IO<A> = IOPure<A> | IOReadLine<A> | IOWriteLine<A>;

type IOPure<A> = {
  tag: "pure";
  value: (() => A) | A;
};

type IOReadLine<A> = {
  tag: "readLine";
  next: (s: string) => IO<A>;
};

type IOWriteLine<A> = {
  next: IO<A>;
  tag: "writeLine";
  text: string;
};

const greeting: IO<void> = {
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
