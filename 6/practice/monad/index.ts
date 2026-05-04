import { stdin as input, stdout as output } from "node:process";
// === 1 Task DSL ===
import readline from "node:readline/promises";

export type IO<A> = Fetch<A> | IOPure<A> | IOReadLine<A> | IOWriteLine<A>;

const exhaustive = (x: never): never => {
  throw new Error(`Unexpected value: ${x}`);
};

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

export type Fetch<A> = {
  tag: "fetch";
  url: string;
  options?: RequestInit;
  next: (body: string) => IO<A>;
};

export type Sleep<A> = {
  ms: number;
  next: IO<A>;
  tag: "sleep";
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

export const fetchUrl = (url: string, options?: RequestInit): IO<string> => ({
  next: pure,
  options,
  tag: "fetch",
  url,
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

    case "fetch":
      return {
        next: (body) => bind(io.next(body), f),
        options: io.options,
        tag: "fetch",
        url: io.url,
      };

    default:
      return exhaustive(io);
  }
};

export const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> => bind(io, (x) => pure(f(x)));

export const andThen = <A, B>(first: IO<A>, second: IO<B>): IO<B> => bind(first, () => second);

// const askName = andThen(writeLine("What is your name?"), readLine);
// const writeName = (name: string) => writeLine(`Hello, ${name}! How old are you?`);
// const writeAge = (name: string, age: string) => writeLine(`Wow, ${name}, ${age} is a great age!`);
//
// export const myProgram = bind(askName, (name) =>
//   bind(andThen(writeName(name), readLine), (age) => writeAge(name, age)),
// );

const myProgram2: IO<void> = bind(writeLine("What is your name?"), () =>
  bind(readLine, (name) =>
    bind(writeLine(`Hello, ${name}! How old are you?`), () =>
      bind(readLine, (age) =>
        bind(writeLine("Loading greeting of the day..."), () =>
          bind(fetchUrl("https://httpbin.org/uuid"), (body) =>
            writeLine(`Wow, ${name}, ${age}! Today's lucky token: ${body}`),
          ),
        ),
      ),
    ),
  ),
);

// === 4.2 sequence ===
export const sequence = <A>(a: IO<A>[]): IO<Array<A>> =>
  a.reduce<IO<Array<A>>>(
    (acc, item) => bind(acc, (arr) => bind(item, (x) => pure([...arr, x]))),
    pure([]),
  );

// === 5 runIO ===

export interface World {
  fetch: (url: string, options?: RequestInit) => Promise<string>;
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
        break;

      case "fetch": {
        const res = await world.fetch(current.url, current.options);
        current = current.next(res);
        break;
      }
    }
  }
};

// === 6 different worlds ===

void (async () => {
  const rl = readline.createInterface({ input, output });

  const productionNodeWorld: World = {
    fetch: async (url, options) => (await fetch(url, options)).text(),
    readLine: () => rl.question(""),
    writeLine: async (s: string) => {
      console.log(s);
    },
  };

  await runIO(myProgram, productionNodeWorld);
  rl.close();
});
// ();

void (async () => {
  const productionBrowserWorld: World = {
    fetch: async (url, options) => (await fetch(url, options)).text(),
    readLine: async () => prompt("") ?? "",
    writeLine: async (s: string) => {
      console.log(s);
    },
  };

  await runIO(myProgram, productionBrowserWorld);
});
// ();

export const makeTestWorld = (
  input: string[],
  fetchMock: Record<string, string>,
): {
  output: string[];
} & World => {
  const output: string[] = [];
  const strs = [...input];

  return {
    fetch: async (url) => {
      if (!(url in fetchMock)) {
        throw new Error(`fetch to ${url} not mocked`);
      }

      return fetchMock[url];
    },
    output,
    readLine: async () => {
      const last = strs.shift();
      if (typeof last === "undefined") {
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
  fetch: async (url, options) => {
    console.log("fetch url: ", url, "with options", options);
    return await inner.fetch(url, options);
  },
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

// === 8 Do notation ===

type IOGen<A> = Generator<IO<unknown>, A, unknown>;
export const doIO = <A>(genFn: () => IOGen<A>): IO<A> => {
  const gen = genFn();

  const walk = (v?: unknown): IO<A> => {
    const result = gen.next(v);

    if (result.done) {
      return pure(result.value);
    }

    return bind(result.value, walk);
  };

  return walk();
};

export function* _<A>(io: IO<A>): Generator<IO<A>, A, A> {
  return yield io;
}

const myProgram = doIO(function* () {
  yield* _(writeLine("What is your name?"));
  const name = yield* _(readLine); // name: string, без каста!
  yield* _(writeLine(`Hello, ${name}! How old are you?`));
  const age = yield* _(readLine);
  const body = yield* _(fetchUrl("https://httpbin.org/uuid"));
  yield* _(writeLine(`Wow, ${name}, ${age}! Token: ${body}`));
});
