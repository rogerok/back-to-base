import { IO, IOGen, RawIO, Result, YieldWrap } from "./types.ts";

const exhaustive = (x: never): never => {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  throw new Error(`Unexpected value: ${x}`);
};

// === 2 Task constructors ===
export const mkIO = <A, E>(io: RawIO<A, E>): IO<A, E> => {
  Object.defineProperty(io, Symbol.iterator, {
    value: function* () {
      return (yield new YieldWrap(this)) as A;
    },
  });

  return io as IO<A, E>;
};

export const attempt = <A, E>(io: IO<A, E>): IO<Result<E, A>> => {
  switch (io.tag) {
    case "pure":
      return mkIO({
        tag: "pure",
        value: { ok: true, value: io.value },
      });

    case "readLine":
      return mkIO({
        next: (x) => attempt(io.next(x)),
        tag: "readLine",
      });

    case "writeLine":
      return mkIO({
        next: attempt(io.next),
        tag: "writeLine",
        text: io.text,
      });

    case "fetch":
      return mkIO({
        next: (body) => attempt(io.next(body)),
        options: io.options,
        tag: "fetch",
        url: io.url,
      });

    case "fail":
      return mkIO({
        tag: "pure",
        value: { error: io.error, ok: false },
      });
  }
};

export const pure = <A>(value: A): IO<A> => mkIO({ tag: "pure", value: value });
export const fail = <E>(error: E): IO<never, E> => mkIO({ error, tag: "fail" });

export const readLine: IO<string> = mkIO({
  next: pure,
  tag: "readLine",
});

export const writeLine = (text: string): IO<void> =>
  mkIO({
    next: pure(undefined),
    tag: "writeLine",
    text,
  });

export const fetchUrl = (url: string, options?: RequestInit): IO<string> =>
  mkIO({
    next: pure,
    options,
    tag: "fetch",
    url,
  });

// === 3 Task bind ====

export const bind = <A, B, E1, E2>(io: IO<A, E1>, f: (a: A) => IO<B, E2>): IO<B, E1 | E2> => {
  switch (io.tag) {
    case "pure":
      return f(io.value);

    case "readLine":
      return mkIO({ next: (x) => bind(io.next(x), f), tag: "readLine" });

    case "writeLine":
      return mkIO({ next: bind(io.next, f), tag: "writeLine", text: io.text });

    case "fetch":
      return mkIO({
        next: (body) => bind(io.next(body), f),
        options: io.options,
        tag: "fetch",
        url: io.url,
      });

    case "fail":
      return mkIO({
        error: io.error,
        tag: "fail",
      });

    default:
      return exhaustive(io);
  }
};

export const map = <A, B>(io: IO<A>, f: (a: A) => B): IO<B> => bind(io, (x) => pure(f(x)));

export const andThen = <A, B>(first: IO<A>, second: IO<B>): IO<B> => bind(first, () => second);

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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

      case "fetch":
        {
          const res = await world.fetch(current.url, current.options);
          current = current.next(res);
          break;
        }
        // TODO: FIX
        exhaustive(current);
    }
  }
};

// === 6 different worlds ===

export const makeTestWorld = (
  input: string[],
  fetchMock: Record<string, string>,
): {
  output: string[];
} & World => {
  const output: string[] = [];
  const strs = [...input];

  return {
    //  eslint-disable-next-line @typescript-eslint/require-await
    fetch: async (url) => {
      if (!(url in fetchMock)) {
        throw new Error(`fetch to ${url} not mocked`);
      }

      return fetchMock[url];
    },
    output,
    //  eslint-disable-next-line @typescript-eslint/require-await
    readLine: async () => {
      const last = strs.shift();
      if (typeof last === "undefined") {
        throw new Error("Mock can't be empty");
      }
      return last;
    },
    //  eslint-disable-next-line @typescript-eslint/require-await
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

export const doIO = <A>(genFn: () => IOGen<A>): IO<A> => {
  const gen = genFn();

  const walk = (v: unknown): IO<A> => {
    const result = gen.next(v);

    if (result.done) {
      return pure(result.value);
    }

    return bind(result.value.value, walk);
  };

  return walk(undefined);
};
