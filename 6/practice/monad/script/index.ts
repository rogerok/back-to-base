import {
  Freer,
  Instr,
  IOGen,
  RawFreer,
  Result,
  TFetch,
  TReadLine,
  TWriteLine,
  YieldWrap,
} from "./types.ts";
import { World } from "./worlds.ts";

// === 2 Task constructors ===
export const mkIO = <A, I extends Instr<any>>(freer: RawFreer<I, A>): Freer<I, A> => {
  Object.defineProperty(freer, Symbol.iterator, {
    value: function* () {
      return (yield new YieldWrap(this)) as A;
    },
  });

  return freer as Freer<I, A>;
};

export const pure = <A, I extends Instr<any>>(value: A): Freer<I, A> =>
  mkIO({
    tag: "pure",
    value: value,
  });

export const fail = <I extends Instr<any>, A>(error: unknown): Freer<I, A> =>
  mkIO({
    cont: (e) => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw e;
    },
    op: {
      error,
      tag: "fail",
    } as unknown as I,
    tag: "impure",
  });

export const readLine: Freer<TReadLine, string> = mkIO({
  cont: pure,
  op: {
    tag: "readLine",
  } as TReadLine,
  tag: "impure",
});

export const writeLine = (text: string): Freer<TWriteLine, void> =>
  mkIO({
    cont: () => pure(undefined),
    op: {
      tag: "writeLine",
      text: text,
    } as TWriteLine,
    tag: "impure",
  });

// === 3 Task bind ====

export const attempt = <A, I extends Instr<any>>(
  freer: Freer<I, A>,
): Freer<I, Result<unknown, A>> => {
  if (freer.tag === "pure") {
    return pure({
      ok: true,
      value: freer.value,
    });
  }

  if (freer.op.tag === "fail") {
    return pure({
      error: freer.op.error,
      ok: false,
    });
  }

  return mkIO({
    cont: (v) => attempt(freer.cont(v)),
    op: freer.op,
    tag: "impure",
  });
};

export const orElse = <A, I extends Instr<any>>(
  freer: Freer<I, A>,
  fallback: (e: unknown) => Freer<I, A>,
): Freer<I, A> => bind(attempt(freer), (a) => (a.ok ? pure(a.value) : fallback(a.error)));

export const mapError = <A, I extends Instr<any>>(
  freer: Freer<I, A>,
  f: (e: unknown) => unknown,
): Freer<I, A> => {
  return orElse(freer, (e) => fail(f(e)));
};

export const fetchUrl = (url: string, options?: RequestInit): Freer<TFetch<string>, string> =>
  mkIO({
    cont: pure,
    op: {
      options,
      tag: "fetch",
      url,
    } as TFetch<string>,
    tag: "impure",
  });

export const parseJson = (body: string): Freer<Instr<any>, unknown> => {
  try {
    return pure(JSON.parse(body));
  } catch (e) {
    return fail(e);
  }
};

// };

export const bind = <I extends Instr<any>, A, B>(
  m: Freer<I, A>,
  f: (a: A) => Freer<I, B>,
): Freer<I, B> => {
  if (m.tag === "pure") {
    return f(m.value);
  }

  return mkIO({
    cont: (resp) => bind(m.cont(resp), f),
    op: m.op,
    tag: "impure",
  });
};

export const map = <A, I extends Instr<any>, B>(freer: Freer<I, A>, f: (a: A) => B): Freer<I, B> =>
  bind(freer, (x) => pure(f(x)));

export const andThen = <A, B, I extends Instr<any>>(
  first: Freer<I, A>,
  second: Freer<I, B>,
): Freer<I, B> => bind(first, () => second);

// === 4.2 sequence ===
export const sequence = <A, I extends Instr<any>>(a: Freer<I, A>[]): Freer<I, Array<A>> =>
  a.reduce<Freer<I, Array<A>>>(
    (acc, item) => bind(acc, (arr) => bind(item, (x) => pure([...arr, x]))),
    pure([]),
  );

// === 5 runIO ===

export const runIO = async <A>(io: Freer<Instr<any>, A>, world: World): Promise<A> => {
  let current: Freer<Instr<any>, A> = io;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    switch (current.tag) {
      case "pure":
        return current.value;

      case "impure": {
        switch (current.op.tag) {
          case "readLine": {
            try {
              const line = await world.readLine();
              current = current.cont(line);
            } catch (e) {
              current = fail(e);
            }

            break;
          }

          case "writeLine":
            try {
              await world.writeLine(current.op.text);
              current = current.cont(undefined);
            } catch (e) {
              current = fail(e);
            }
            break;

          case "fetch": {
            try {
              const res = await world.fetch(current.op.url, current.op.options);
              current = current.cont(res);
            } catch (e) {
              current = fail(e);
            }
            break;
          }

          case "fail":
            throw current.op.error;
        }
      }
    }
  }
};

export const doIO = <A>(genFn: () => IOGen<A>): Freer<Instr<any>, A> => {
  const gen = genFn();

  const walk = (v: unknown): Freer<Instr<any>, A> => {
    const result = gen.next(v);

    if (result.done) {
      return pure(result.value);
    }

    return bind(result.value.value, walk);
  };

  return walk(undefined);
};
