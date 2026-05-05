// === 8 Do notation ===
import { bind, IO, pure } from "./index.ts";

export class YieldWrap<T> {
  readonly _Y!: () => T;
  constructor(readonly value: T) {}
}

export const mkIO = <A>(io: IO<A>): IO<A> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (io as any)[Symbol.iterator] = function* () {
    return (yield new YieldWrap(this)) as A;
  };

  return io;
};
export type IOGen<A> = Generator<IO<unknown>, A, unknown>;
export const doIO = <A>(genFn: () => IOGen<A>): IO<A> => {
  const gen = genFn();

  const walk = (v: unknown): IO<A> => {
    const result = gen.next(v);

    if (result.done) {
      return pure(result.value);
    }

    return bind(result.value, walk);
  };

  return walk(undefined);
};

export function* _<A>(io: IO<A>): Generator<IO<A>, A, A> {
  return yield io;
}
