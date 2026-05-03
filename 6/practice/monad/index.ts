import { stdin as input, stdout as output } from "node:process";
// === 1 Task DSL ===
import readline from "node:readline/promises";

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

// === 4.2 sequence ===
export const sequence = <A>(a: IO<A>[]): IO<Array<A>> =>
  a.reduce<IO<Array<A>>>(
    (acc, item) => bind(acc, (arr) => bind(item, (x) => pure([...arr, x]))),
    pure([]),
  );

// === 5 runIO ===

export interface World {
  readLine: () => Promise<string>;
  writeLine: (s: string) => Promise<void>;
}

export const runIO = async <A>(io: IO<A>, world: World): Promise<A> => {
  let current: IO<any> = io;

  while (true) {
    switch (current.tag) {
      case "pure":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return current.value;

      case "readLine": {
        const line = await world.readLine();
        current = current.next(line);
        break;
      }

      case "writeLine":
        await world.writeLine(current.text);
        current = current.next;
    }
  }
};

// === 6 different worlds ===

void (async () => {
  const rl = readline.createInterface({ input, output });

  const productionNodeWorld: World = {
    readLine: () => rl.question(""),
    writeLine: async (s: string) => {
      console.log(s);
    },
  };

  // await runIO(myProgram, productionNodeWorld);
  // rl.close();
})();

void (async () => {
  const productionBrowserWorld: World = {
    readLine: async () => prompt("") ?? "",
    writeLine: async (s: string) => {
      console.log(s);
    },
  };

  // await runIO(myProgram, productionBrowserWorld);
})();

export const makeTestWorld = (
  input: string[],
): {
  output: string[];
} & World => {
  const output: string[] = [];
  const strs = [...input];

  return {
    output,
    readLine: async () => {
      const last = strs.shift();
      if (!last) {
        throw new Error("Mock can't be empty");
      }
      return last;
    },
    writeLine: async (s: string) => {
      output.push(s);
    },
  };
};

export const loggingWorld = (inner: World): World => ({
  readLine: async () => {
    const result = await inner.readLine();
    console.log("readline: ", result);
    return result;
  },
  writeLine: async (s: string) => {
    console.log("write line: ", s);
    await inner.writeLine(s);
  },
});
