import { FetchError, HttpError, ParseError } from "./errors.ts";
import { IO, IOGen, RawIO, Result, YieldWrap } from "./types.ts";
import { exhaustive } from "./utils.ts";
import { World } from "./worlds.ts";

// === 2 Task constructors ===
export const mkIO = <A, E>(io: RawIO<A, E>): IO<A, E> => {
  Object.defineProperty(io, Symbol.iterator, {
    value: function* () {
      return (yield new YieldWrap(this)) as A;
    },
  });

  return io as IO<A, E>;
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

// === 3 Task bind ====

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

export const orElse = <A, E1, E2>(io: IO<A, E1>, fallback: (e: E1) => IO<A, E2>): IO<A, E2> =>
  bind(attempt(io), (a) => (a.ok ? pure(a.value) : fallback(a.error)));

export const mapError = <A, E1, E2>(io: IO<A, E1>, f: (e: E1) => E2): IO<A, E2> => {
  return orElse(io, (e) => fail(f(e)));
};

export const fetchUrl = (
  url: string,
  options?: RequestInit,
): IO<string, FetchError | HttpError> => {
  return mapError(
    mkIO<string, unknown>({
      next: pure,
      options,
      tag: "fetch",
      url,
    }),
    (e) =>
      e instanceof HttpError || e instanceof FetchError ? e : new FetchError(url, "unknown error"),
  );
};

export const parseJson = (body: string): IO<unknown, ParseError> => {
  try {
    return pure(JSON.parse(body));
  } catch (e) {
    return fail(new ParseError(e instanceof Error ? String(e.cause) : "Cannot parse json"));
  }
};

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

export const runIO = async <A>(io: IO<A>, world: World): Promise<A> => {
  let current: IO<any, any> = io;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    switch (current.tag) {
      case "pure":
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return current.value;

      case "readLine": {
        try {
          const line = await world.readLine();
          current = current.next(line);
        } catch (e) {
          current = fail(e);
        }

        break;
      }

      case "writeLine":
        try {
          await world.writeLine(current.text);
          current = current.next;
        } catch (e) {
          current = fail(e);
        }
        break;

      case "fetch": {
        try {
          const res = await world.fetch(current.url, current.options);
          current = current.next(res);
        } catch (e) {
          current = fail(e);
        }
        break;
      }

      case "fail":
        throw current.error;
    }
  }
};

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
