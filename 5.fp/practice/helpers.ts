type Curry<Args extends unknown[], R> = Args extends [infer A, ...infer Rest]
  ? (arg: A) => Curry<Rest, R>
  : R;

export function curry<Args extends unknown[], R>(fn: (...args: Args) => R): Curry<Args, R> {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...(args as Args));
    }

    return (...next: unknown[]) => curried(...args, ...next);
  } as Curry<Args, R>;
}

export const split = curry((sep: string, s: string): string[] => s.split(sep));

export const match = curry((what: RegExp, s: string): RegExpMatchArray | null => s.match(what));

export const replace = curry((what: RegExp | string, replacement: string, s: string): string =>
  s.replace(what, replacement),
);

// export const filter = curry(<T>(f: (x: T) => boolean, xs: T[]): T[] => xs.filter(f));

export const map = curry(<T, U>(f: (x: T) => U, xs: T[]): U[] => xs.map(f));

export const intercalate = curry((str: string, xs: string[]): string => xs.join(str));
dsdsывsdssыф;
